import fs from 'fs';
import path from 'path';
import prisma from '../config/database.js';
import type { AIAnalysisResult } from './ai.service.js';
import { AIService } from './ai.service.js';
import { GeoService } from './geo.service.js';
import { RoutingService } from './routing.service.js';

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
        type: 'НЕ_РАЗОБРАНО',
        sentiment: 'Нейтральный',
        priority: 0,
        language: 'RU',
        summary: 'Автоматический анализ невозможен: отсутствуют описание и вложения. Требуется ручной разбор (Manual Review).',
    };
}

const TICKET_FULL_INCLUDE = {
    analysis: true,
    manager: true,
    office: true,
    assignmentLogs: {
        include: { fromManager: true, toManager: true, assignedBy: true },
        orderBy: { createdAt: 'desc' as const },
    },
};

export class TicketService {
    constructor(
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
        const description = data.description;
        let attachments = data.attachments;

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
                importSessionId: data.importSessionId,
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

        // --- NEW: SPAM HANDLING ---
        if (aiResult.type === 'Спам') {
            await prisma.ticketAnalysis.create({
                data: {
                    ticketId: ticket.id,
                    type: 'Спам' as any,
                    sentiment: aiResult.sentiment as any,
                    priority: aiResult.priority,
                    language: aiResult.language,
                    summary: aiResult.summary,
                    aiDuration,
                    totalDuration: Math.round(performance.now() - totalStart),
                    trace: { note: "Тикет классифицирован как спам. Роутинг пропущен." } as any
                }
            });
            console.log(`[Ticket] ID ${ticket.id} marked as SPAM. Skipping routing.`);
            return { ticket: await prisma.ticket.findUnique({ where: { id: ticket.id }, include: TICKET_FULL_INCLUDE }), isSpam: true };
        }

        // 3. Геокодинг
        const locationSource = aiResult.normalizedLocation || {
            city: data.city,
            region: data.oblast,
            country: data.country
        };

        const geoStart = performance.now();
        const { coords, trace: geoTrace } = await this.geo.getCoordinatesWithTrace({
            country: locationSource.country,
            oblast: locationSource.region || data.oblast,
            city: locationSource.city || data.city,
            street: data.street,
            houseNumber: data.houseNumber
        });
        const geoDuration = Math.round(performance.now() - geoStart);

        // --- NEW: Save preliminary analysis with coords for routing to use ---
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
            }
        });

        // 4. Маршрутизация
        const routingStart = performance.now();
        const routing = await this.routing.findBestManager(ticket.id, segment, aiResult);
        const routingDuration = Math.round(performance.now() - routingStart);

        // 5. Atomic Update via Transaction
        const totalDuration = Math.round(performance.now() - totalStart);
        const diagnosticTrace = {
            steps: [
                { name: "Анализ текста", response: aiResult, duration: aiDuration },
                { name: "Геолокация", result: coords, duration: geoDuration },
                { name: "Маршрутизация", payload: routing, duration: routingDuration }
            ],
            totalDuration
        };

        const finalTicket = await prisma.$transaction(async (tx) => {
            // Update ticket
            await tx.ticket.update({
                where: { id: ticket.id },
                data: { managerId: routing.managerId, officeId: routing.officeId },
            });

            // Update manager count
            await tx.manager.update({
                where: { id: routing.managerId },
                data: { activeTicketCount: { increment: 1 } },
            });

            // Create assignment log
            await tx.assignmentLog.create({
                data: {
                    ticketId: ticket.id,
                    toManagerId: routing.managerId,
                    assignedById: routing.managerId,
                    reason: routing.reason,
                },
            });

            // Update analysis with trace and final metrics
            await tx.ticketAnalysis.update({
                where: { ticketId: ticket.id },
                data: {
                    routingDuration,
                    totalDuration,
                    trace: diagnosticTrace as any
                }
            });

            return tx.ticket.findUnique({
                where: { id: ticket.id },
                include: TICKET_FULL_INCLUDE,
            });
        });

        return {
            ticket: finalTicket,
            analysis: aiResult,
            performance: { ai: aiDuration, geo: geoDuration, routing: routingDuration, total: totalDuration },
            routing: { managerId: routing.managerId, officeId: routing.officeId, reason: routing.reason },
        };
    }

    async importTickets(csvData: Record<string, string>[]) {
        let processed = 0, failed = 0;
        const results: any[] = [];

        for (const row of csvData) {
            const idx = processed + failed + 1;
            try {
                const result = await this.processSingleTicket({
                    clientGuid: row['GUID клиента'],
                    gender: row['Пол клиента'],
                    dateOfBirth: row['Дата рождения'],
                    description: row['Описание'],
                    attachments: row['Вложения'],
                    segment: row['Сегмент клиента'],
                    country: row['Страна'],
                    oblast: row['Область'],
                    city: row['Населённый пункт'],
                    street: row['Улица'],
                    houseNumber: row['Дом'],
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

    async getTickets(f: any, p: any) {
        const where: any = {};
        if (f.managerId) where.managerId = f.managerId;
        if (f.officeId) where.officeId = f.officeId;
        if (f.segment) where.segment = f.segment;

        const [tickets, total] = await Promise.all([
            prisma.ticket.findMany({
                where, ...p,
                include: { analysis: true, manager: true, office: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.ticket.count({ where }),
        ]);
        return { tickets, total };
    }

    async getTicketById(id: string) {
        return prisma.ticket.findUnique({
            where: { id },
            include: TICKET_FULL_INCLUDE,
        });
    }

    async closeTicket(id: string) {
        const ticket = await prisma.ticket.findUnique({ where: { id }, select: { managerId: true } });
        if (!ticket) throw new Error('Ticket not found');

        if (ticket.managerId) {
            await prisma.manager.update({
                where: { id: ticket.managerId },
                data: { activeTicketCount: { increment: -1 } },
            });
        }

        return prisma.ticket.update({
            where: { id },
            data: { updatedAt: new Date() },
            include: TICKET_FULL_INCLUDE,
        });
    }
}
