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

export class TicketService {
    constructor(
        private ticketRepo: TicketRepository,
        private managerRepo: ManagerRepository,
        private ai: AIService,
        private geo: GeoService,
        private routing: RoutingService
    ) { }

    async importTickets(csvData: Record<string, string>[]) {
        let processed = 0, failed = 0;
        console.log(`[Import] Batch: ${csvData.length} records`);

        for (const row of csvData) {
            const idx = processed + failed + 1;
            try {
                const segment = mapSegment(getVal(row, ['Сегмент клиента', 'Сегмент']));
                const description = getVal(row, ['Описание', 'Description']);
                const city = getVal(row, ['Населённый пункт', 'Город', 'City']);
                const clientGuid = getVal(row, ['GUID клиента', 'GUID', 'clientGuid']);

                if (!description || !clientGuid) { failed++; continue; }

                // 1. Создаем тикет
                const ticket = await prisma.ticket.create({
                    data: {
                        clientGuid,
                        gender: getVal(row, ['Пол клиента', 'Пол']),
                        dateOfBirth: getVal(row, ['Дата рождения']) ? new Date(getVal(row, ['Дата рождения'])) : new Date(),
                        description, segment,
                        attachments: getVal(row, ['Вложения']) || null,
                        country: getVal(row, ['Страна']) || 'Казахстан',
                        oblast: getVal(row, ['Область']) || '',
                        city,
                        street: getVal(row, ['Улица']) || '',
                        houseNumber: getVal(row, ['Дом']) || '',
                    },
                });

                // 2. AI анализ + Геокодинг параллельно
                const address = `${getVal(row, ['Страна']) || 'Казахстан'}, ${city}, ${getVal(row, ['Улица'])} ${getVal(row, ['Дом'])}`.trim();
                const [aiResult, geoResult] = await Promise.all([
                    this.ai.analyzeTicket(description),
                    this.geo.getCoordinates(address),
                ]);

                // 3. Сохраняем результат анализа
                await prisma.ticketAnalysis.create({
                    data: {
                        ticketId: ticket.id,
                        type: aiResult.type, sentiment: aiResult.sentiment,
                        priority: aiResult.priority, language: aiResult.language,
                        summary: aiResult.summary,
                        latitude: geoResult?.lat ?? null,
                        longitude: geoResult?.lng ?? null,
                    },
                });

                // 4. Маршрутизация → назначение менеджера
                const routing = await this.routing.findBestManager(ticket.id, segment, aiResult);
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { managerId: routing.managerId, officeId: routing.officeId },
                });

                // 5. Лог назначения
                await prisma.assignmentLog.create({
                    data: {
                        ticketId: ticket.id,
                        toManagerId: routing.managerId,
                        assignedById: routing.managerId,
                        reason: routing.reason,
                    },
                });

                await this.managerRepo.updateActiveCount(routing.managerId, 1);
                console.log(`[#${idx}] ✅ ${routing.reason}`);
                processed++;
            } catch (err: unknown) {
                console.error(`[#${idx}] ❌`, err instanceof Error ? err.message : err);
                failed++;
            }
        }

        return { processed, failed };
    }

    async getTickets(
        filters: { managerId?: string; officeId?: string; segment?: string },
        pagination: { skip: number; take: number },
        user: { id: string; role: string; officeId?: string }
    ) {
        const scoped: any = { ...filters };
        if (user.role === 'MANAGER') scoped.managerId = user.id;
        else if (user.role === 'OFFICE_ADMIN' && user.officeId) scoped.officeId = user.officeId;
        return this.ticketRepo.findMany(scoped, pagination);
    }

    async getTicketById(id: string) {
        return this.ticketRepo.findById(id);
    }
}
