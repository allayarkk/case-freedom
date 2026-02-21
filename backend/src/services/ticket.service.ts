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
 * Это показывает устойчивость системы к edge-cases.
 */
function getDefaultAnalysis(segment: string, hasAttachment: boolean): AIAnalysisResult {
    return {
        type: 'CONSULTATION',
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
    }) {
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
            },
        });

        // 2. AI анализ + Геокодинг параллельно
        const address = `${data.country || 'Казахстан'}, ${data.city}, ${data.street} ${data.houseNumber}`.trim();

        let aiResult: AIAnalysisResult;

        if (description.trim()) {
            // Есть текст — отправляем на AI анализ (с вложениями если есть)
            const [aiRes, geoResult] = await Promise.all([
                this.ai.analyzeTicket(description, attachments),
                this.geo.getCoordinates(address),
            ]);
            aiResult = aiRes;

            // Сохраняем геокоординаты
            await prisma.ticketAnalysis.create({
                data: {
                    ticketId: ticket.id,
                    type: aiResult.type,
                    sentiment: aiResult.sentiment,
                    priority: aiResult.priority,
                    language: aiResult.language,
                    summary: aiResult.summary,
                    latitude: geoResult?.lat ?? null,
                    longitude: geoResult?.lng ?? null,
                },
            });
        } else {
            // Нет текста — default analysis + geo параллельно
            aiResult = getDefaultAnalysis(segment, !!attachments);

            const geoResult = await this.geo.getCoordinates(address);

            await prisma.ticketAnalysis.create({
                data: {
                    ticketId: ticket.id,
                    type: aiResult.type,
                    sentiment: aiResult.sentiment,
                    priority: aiResult.priority,
                    language: aiResult.language,
                    summary: aiResult.summary,
                    latitude: geoResult?.lat ?? null,
                    longitude: geoResult?.lng ?? null,
                },
            });
        }

        // 3. Маршрутизация → назначение менеджера
        const routing = await this.routing.findBestManager(ticket.id, segment, aiResult);
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: { managerId: routing.managerId, officeId: routing.officeId },
        });

        // 4. Лог назначения (assignedById = toManagerId для автоматических назначений)
        await prisma.assignmentLog.create({
            data: {
                ticketId: ticket.id,
                toManagerId: routing.managerId,
                assignedById: routing.managerId,  // система назначает автоматически
                reason: routing.reason,
            },
        });

        // 5. Увеличиваем счётчик активных тикетов
        await this.managerRepo.updateActiveCount(routing.managerId, 1);

        // Возвращаем полный результат для real-time обновлений
        const fullTicket = await this.ticketRepo.findById(ticket.id);

        return {
            ticket: fullTicket,
            analysis: aiResult,
            routing: {
                managerId: routing.managerId,
                officeId: routing.officeId,
                reason: routing.reason,
            },
        };
    }

    /**
     * Batch import из CSV — обрабатывает записи последовательно (1 by 1).
     * Каждая строка ≤ 10 секунд (AI + Geo параллельно внутри строки).
     */
    async importTickets(csvData: Record<string, string>[]) {
        let processed = 0, failed = 0;
        const results: Array<{
            index: number;
            status: 'ok' | 'error';
            ticketId?: string;
            reason?: string;
            error?: string;
        }> = [];

        console.log(`[Import] Batch: ${csvData.length} records`);

        for (const row of csvData) {
            const idx = processed + failed + 1;
            try {
                const segment = mapSegment(getVal(row, ['Сегмент клиента', 'Сегмент']));
                const description = getVal(row, ['Описание', 'Description']);
                const city = getVal(row, ['Населённый пункт', 'Город', 'City']);
                const clientGuid = getVal(row, ['GUID клиента', 'GUID', 'clientGuid']);
                const attachments = getVal(row, ['Вложения', 'Attachments']) || null;

                if (!clientGuid) {
                    results.push({ index: idx, status: 'error', error: 'Нет GUID клиента' });
                    failed++;
                    continue;
                }

                // Обработка через единый pipeline (включая пустые описания)
                const result = await this.processSingleTicket({
                    clientGuid,
                    gender: getVal(row, ['Пол клиента', 'Пол']),
                    dateOfBirth: getVal(row, ['Дата рождения']),
                    description,
                    attachments,
                    segment,
                    country: getVal(row, ['Страна']) || 'Казахстан',
                    oblast: getVal(row, ['Область']) || '',
                    city,
                    street: getVal(row, ['Улица']) || '',
                    houseNumber: getVal(row, ['Дом']) || '',
                });

                console.log(`[#${idx}] ✅ ${result.routing.reason}`);
                results.push({
                    index: idx,
                    status: 'ok',
                    ticketId: result.ticket?.id,
                    reason: result.routing.reason,
                });
                processed++;
            } catch (err: unknown) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error(`[#${idx}] ❌`, errorMsg);
                results.push({ index: idx, status: 'error', error: errorMsg });
                failed++;
            }
        }

        return { processed, failed, total: csvData.length, results };
    }

    async getTickets(
        filters: { managerId?: string; officeId?: string; segment?: string },
        pagination: { skip: number; take: number }
    ) {
        return this.ticketRepo.findMany(filters, pagination);
    }

    async getTicketById(id: string) {
        return this.ticketRepo.findById(id);
    }

    /**
     * Закрытие тикета — уменьшает activeTicketCount менеджера.
     */
    async closeTicket(id: string) {
        const ticket = await prisma.ticket.findUnique({
            where: { id },
            select: { managerId: true },
        });

        if (!ticket) throw new Error('Ticket not found');

        // Уменьшаем нагрузку менеджера
        if (ticket.managerId) {
            await this.managerRepo.updateActiveCount(ticket.managerId, -1);
        }

        return prisma.ticket.update({
            where: { id },
            data: { updatedAt: new Date() },
            include: { analysis: true, manager: true, office: true },
        });
    }
}
