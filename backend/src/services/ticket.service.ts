import fs from 'fs';
import path from 'path';
import prisma from '../config/database.js';
import type { AIAnalysisResult } from './ai.service.js';
import { AIService } from './ai.service.js';
import { GeoService } from './geo.service.js';
import { RoutingService } from './routing.service.js';
import { ManagerRepository } from '../repositories/manager.repository.js';
import { TicketRepository } from '../repositories/ticket.repository.js';

type Segment = 'VIP' | 'MASS' | 'PRIORITY';

function mapSegment(val: string): Segment {
    const s = val.toLowerCase();
    if (s.includes('vip')) return 'VIP';
    if (s.includes('приор')) return 'PRIORITY';
    return 'MASS';
}

/**
 * Сценарий, когда AI не может провести анализ (нет данных).
 */
function getDefaultAnalysis(): AIAnalysisResult {
    return {
        type: 'Консультация',
        sentiment: 'Нейтральный',
        priority: 0, // Статус "НЕ РАЗОБРАНО" во фронтенде
        language: 'RU',
        summary: 'Автоматический анализ невозможен: отсутствуют описание и вложения. Требуется ручной разбор (Manual Review).',
    };
}

export class TicketService {
    constructor(
        private ticketRepo: TicketRepository,
        private managerRepo: ManagerRepository,
        private ai: AIService,
        private geo: GeoService,
        private routing: RoutingService
    ) { }

    /**
     * Обрабатывает один тикет: AI анализ + Гео + Routing + Назначение
     */
    async processSingleTicket(data: {
        clientGuid: string;
        gender: string;
        dateOfBirth: string;
        description: string;
        attachments: string | null;
        segment: string;
        country: string;
        oblast: string;
        city: string;
        street: string;
        houseNumber: string;
        importSessionId?: string;
    }) {
        const totalStart = performance.now();
        const segment = mapSegment(data.segment);
        const description = data.description || '';
        let attachments = data.attachments || null;

        // --- NEW: Local Attachment Resolution ---
        let aiAttachment = attachments;
        if (attachments && !attachments.startsWith('http') && !attachments.startsWith('data:')) {
            try {
                const filePath = path.join(process.cwd(), 'attachments', attachments);
                if (fs.existsSync(filePath)) {
                    const buffer = fs.readFileSync(filePath);
                    aiAttachment = buffer.toString('base64');
                    console.log(`[Ticket] Resolved local attachment: ${attachments} (${Math.round(buffer.length / 1024)} KB)`);
                }
            } catch (err) {
                console.warn(`[Ticket] Failed to read local attachment ${attachments}:`, err);
            }
        }

        // 1. Создаем тикет
        const ticket = await prisma.ticket.create({
            data: {
                clientGuid: data.clientGuid,
                gender: data.gender,
                dateOfBirth: new Date(data.dateOfBirth),
                description,
                segment,
                attachments,
                country: data.country,
                oblast: data.oblast,
                city: data.city,
                street: data.street,
                houseNumber: data.houseNumber,
                importSessionId: data.importSessionId || null,
            },
        });

        // 2. AI анализ
        const measureAI = async (): Promise<AIAnalysisResult> => {
            if (!description.trim() && !aiAttachment) {
                return getDefaultAnalysis();
            }
            return await this.ai.analyzeTicket(description, segment, aiAttachment);
        };

        const aiStart = performance.now();
        const aiResult = await measureAI();
        const aiDuration = Math.round(performance.now() - aiStart);

        // 3. Геокодинг с использованием нормализованных данных от ИИ
        const locationSource = aiResult.normalizedLocation || {
            city: data.city,
            region: data.oblast,
            country: data.country || 'Казахстан'
        };

        const geoStart = performance.now();
        const { coords, trace: geoTrace } = await this.geo.getCoordinatesWithTrace({
            country: locationSource.country || 'Казахстан',
            oblast: locationSource.region || data.oblast,
            city: locationSource.city || data.city,
            street: data.street,
            houseNumber: data.houseNumber
        });
        const geoDuration = Math.round(performance.now() - geoStart);

        // 4. Маршрутизация
        const routingStart = performance.now();
        const routing = await this.routing.findBestManager(ticket.id, segment, aiResult);
        const routingDuration = Math.round(performance.now() - routingStart);

        // 5. Сборка общего диагностического лога
        const totalDuration = Math.round(performance.now() - totalStart);
        const diagnosticTrace = {
            steps: [
                {
                    name: "Анализ текста",
                    description: "Классификация обращения и извлечение данных через AI",
                    payload: {
                        instructions: "CATEGORIZATION, FRAUD_DETECTION",
                        input: description,
                        segment,
                        has_attachments: !!attachments
                    },
                    response: aiResult,
                    logic: {
                        fraud_check: description.toLowerCase().match(/fraud|scam|stolen|мошен|краж|списан/) ? "Найдено" : "Нет",
                    },
                    duration: aiDuration
                },
                {
                    name: "Геолокация",
                    description: "Поиск координат по адресу клиента",
                    payload: {
                        input: { city: data.city, oblast: data.oblast, country: data.country },
                        normalized: aiResult.normalizedLocation
                    },
                    attempts: geoTrace,
                    result: coords,
                    duration: geoDuration
                },
                {
                    name: "Маршрутизация",
                    description: "Выбор подходящего менеджера и офиса",
                    payload: routing,
                    duration: routingDuration
                }
            ],
            totalDuration
        };

        // 6. Сохраняем анализ и тайминги
        await prisma.ticketAnalysis.create({
            data: {
                ticketId: ticket.id,
                type: aiResult.type as any,
                sentiment: aiResult.sentiment as any,
                priority: aiResult.priority,
                language: aiResult.language,
                summary: aiResult.summary,
                latitude: coords?.lat ?? null,
                longitude: coords?.lng ?? null,
                aiDuration,
                geoDuration,
                routingDuration,
                totalDuration,
                trace: diagnosticTrace as any
            },
        });

        // 6. Обновляем тикет
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: { managerId: routing.managerId, officeId: routing.officeId },
        });

        // 7. Лог назначения
        await prisma.assignmentLog.create({
            data: {
                ticketId: ticket.id,
                toManagerId: routing.managerId,
                assignedById: routing.managerId,
                reason: routing.reason,
            },
        });

        // 8. Увеличиваем счётчик
        await this.managerRepo.updateActiveCount(routing.managerId, 1);

        const fullTicket = await this.ticketRepo.findById(ticket.id);

        return {
            ticket: fullTicket,
            analysis: aiResult,
            performance: {
                ai: aiDuration,
                geo: geoDuration,
                routing: routingDuration,
                total: totalDuration,
            },
            routing: {
                managerId: routing.managerId,
                officeId: routing.officeId,
                reason: routing.reason,
            },
        };
    }

    async importTickets(csvData: Record<string, string>[]) {
        let processed = 0, failed = 0;
        const results: any[] = [];

        for (const row of csvData) {
            const idx = processed + failed + 1;
            try {
                const result = await this.processSingleTicket({
                    clientGuid: row['GUID клиента'] || '',
                    gender: row['Пол клиента'] || '',
                    dateOfBirth: row['Дата рождения'] || '',
                    description: row['Описание'] || '',
                    attachments: row['Вложения'] || '',
                    segment: row['Сегмент клиента'] || '',
                    country: row['Страна'] || '',
                    oblast: row['Область'] || '',
                    city: row['Населённый пункт'] || '',
                    street: row['Улица'] || '',
                    houseNumber: row['Дом'] || '',
                });
                results.push({ index: idx, status: 'ok', ticketId: result.ticket?.id });
                processed++;
            } catch (err) {
                failed++;
                results.push({ index: idx, status: 'error', error: String(err) });
            }
        }
        return { processed, failed, total: csvData.length, results };
    }

    async getTickets(f: any, p: any) { return this.ticketRepo.findMany(f, p); }
    async getTicketById(id: string) { return this.ticketRepo.findById(id); }

    async closeTicket(id: string) {
        const ticket = await prisma.ticket.findUnique({ where: { id }, select: { managerId: true } });
        if (!ticket) throw new Error('Ticket not found');
        if (ticket.managerId) await this.managerRepo.updateActiveCount(ticket.managerId, -1);
        return prisma.ticket.update({
            where: { id },
            data: { updatedAt: new Date() },
            include: { analysis: true, manager: true, office: true },
        });
    }
}
