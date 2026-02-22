import prisma from '../config/database.js';
import type { AIAnalysisResult } from './ai.service.js';
import { AIService } from './ai.service.js';
import { GeoService } from './geo.service.js';
import { RoutingService } from './routing.service.js';
import { ManagerRepository } from '../repositories/manager.repository.js';
import { TicketRepository } from '../repositories/ticket.repository.js';

type Segment = 'VIP' | 'MASS' | 'PRIORITY';

function mapSegment(val?: string): Segment {
    const s = (val || '').toUpperCase().trim();
    if (s === 'VIP') return 'VIP';
    if (s === 'PRIORITY') return 'PRIORITY';
    return 'MASS';
}

/** Ищет значение в строке CSV, игнорируя регистр и пробелы в именах колонок */
function getVal(row: Record<string, string>, keys: string[]): string {
    for (const pk of keys) {
        const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === pk.toLowerCase());
        if (found) return row[found];
    }
    return '';
}

/**
 * Генерирует default AI result для случаев без текста.
 */
function getDefaultAnalysis(segment: string, hasAttachment: boolean): AIAnalysisResult {
    return {
        type: 'Консультация',
        sentiment: 'NEUTRAL',
        priority: segment === 'VIP' ? 6 : 5,
        language: 'RU',
        summary: hasAttachment
            ? 'Обращение без текста. Содержит вложение — требуется ручной анализ вложения менеджером.'
            : 'Обращение без текстового описания. Требуется ручной анализ менеджером.',
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
        const attachments = data.attachments || null;

        // 1. Создаем тикет
        const ticket = await prisma.ticket.create({
            data: {
                clientGuid: data.clientGuid,
                gender: data.gender,
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date(),
                description,
                segment,
                attachments,
                country: data.country || 'Казахстан',
                oblast: data.oblast || '',
                city: data.city,
                street: data.street || '',
                houseNumber: data.houseNumber || '',
                importSessionId: data.importSessionId || null,
            },
        });

        // 2. AI анализ (теперь первый, чтобы получить нормализованный адрес)
        const measureAI = async (): Promise<AIAnalysisResult> => {
            if (!description.trim()) {
                return getDefaultAnalysis(segment, !!attachments);
            }
            return await this.ai.analyzeTicket(description, segment, attachments);
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
            version: "3.0-ULTRA-DIAGNOSTIC",
            steps: [
                {
                    name: "AI_АНАЛИЗ_КОНТЕНТА",
                    description: "Инференс языковой модели для классификации и извлечения атрибутов",
                    payload: {
                        system_instructions: "FRAUD_DETECTION, LOCATION_NORMALIZATION, CATEGORIZATION",
                        input_text: description,
                        client_segment: segment,
                        has_attachments: !!attachments
                    },
                    response: aiResult,
                    logic: {
                        priority_derivation: aiResult.priority >= 10 ? "Критический уровень (определено ИИ как Мошеннические_действия или риск потери клиента)" :
                            aiResult.priority >= 8 ? "Высокий приоритет (негативный тон и VIP сегмент)" : "Стандартный приоритет",
                        fraud_check: description.toLowerCase().match(/fraud|scam|stolen|unauthorized|suspicious|legal|legalit|victim|мошен|краж|списан|незакон/) ? "ПОЛОЖИТЕЛЬНО (Обнаружены ключевые слова)" : "ОТРИЦАТЕЛЬНО",
                    },
                    duration: aiDuration
                },
                {
                    name: "ГЕО_СИНТЕЗ_И_ПОИСК",
                    description: "Многоуровневый поиск географических координат",
                    payload: {
                        raw_input: { city: data.city, oblast: data.oblast, country: data.country },
                        ai_normalized: aiResult.normalizedLocation
                    },
                    attempts: geoTrace,
                    result: coords,
                    duration: geoDuration
                },
                {
                    name: "ДВИЖОК_МАРШРУТИЗАЦИИ",
                    description: "Алгоритмический подбор оптимального исполнителя",
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
                    clientGuid: getVal(row, ['GUID клиента', 'GUID', 'clientGuid']),
                    gender: getVal(row, ['Пол клиента', 'Пол']),
                    dateOfBirth: getVal(row, ['Дата рождения']),
                    description: getVal(row, ['Описание', 'Description']),
                    attachments: getVal(row, ['Вложения', 'Attachments']),
                    segment: getVal(row, ['Сегмент клиента', 'Сегмент']),
                    country: getVal(row, ['Страна']),
                    oblast: getVal(row, ['Область']),
                    city: getVal(row, ['Населённый пункт', 'Город']),
                    street: getVal(row, ['Улица']),
                    houseNumber: getVal(row, ['Дом']),
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
