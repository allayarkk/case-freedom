import prisma from '../config/database.js';
import type { AIAnalysisResult } from './ai.service.js';
import { AIService } from './ai.service.js';
import { GeoService } from './geo.service.js';
import { RoutingService } from './routing.service.js';
import { ManagerRepository } from '../repositories/manager.repository.js';
import { TicketRepository } from '../repositories/ticket.repository.js';

interface UserContext {
    id: string;
    role: 'ADMIN' | 'OFFICE_ADMIN' | 'MANAGER';
    officeId?: string;
}

type SegmentValue = 'VIP' | 'MASS' | 'PRIORITY';

function mapSegment(val: string | undefined): SegmentValue {
    if (!val) return 'MASS';
    const s = val.toUpperCase().trim();
    if (s === 'VIP') return 'VIP';
    if (s === 'PRIORITY') return 'PRIORITY';
    return 'MASS';
}

/**
 * Utility to find value in record regardless of case or trailing spaces in keys
 */
function getVal(row: Record<string, string>, possibleKeys: string[]): string {
    const rowKeys = Object.keys(row);
    for (const pk of possibleKeys) {
        const found = rowKeys.find(rk => rk.trim().toLowerCase() === pk.toLowerCase());
        if (found) return row[found];
    }
    return '';
}

export class TicketService {
    constructor(
        private ticketRepo: TicketRepository,
        private managerRepo: ManagerRepository,
        private aiService: AIService,
        private geoService: GeoService,
        private routingService: RoutingService
    ) { }

    async importTickets(csvData: Record<string, string>[]): Promise<{ processed: number; failed: number }> {
        let processed = 0;
        let failed = 0;

        console.log(`[Import] Processing batch of ${csvData.length} records`);

        for (const row of csvData) {
            const idx = processed + failed + 1;
            try {
                const segment = mapSegment(getVal(row, ['Сегмент клиента', 'Сегмент']));
                const description = getVal(row, ['Описание', 'Description', 'Описание ']);
                const city = getVal(row, ['Населённый пункт', 'Город', 'City']);
                const clientGuid = getVal(row, ['GUID клиента', 'GUID', 'clientGuid']);

                if (!description || !clientGuid) {
                    console.log(`[#${idx}] Skipping empty or invalid row`);
                    failed++;
                    continue;
                }

                console.log(`[#${idx}] Processing ticket for client ${clientGuid}`);

                // 1. Create ticket
                const ticket = await prisma.ticket.create({
                    data: {
                        clientGuid,
                        gender: getVal(row, ['Пол клиента', 'Пол']),
                        dateOfBirth: getVal(row, ['Дата рождения']) ? new Date(getVal(row, ['Дата рождения'])) : new Date(),
                        description,
                        attachments: getVal(row, ['Вложения']) || null,
                        segment,
                        country: getVal(row, ['Страна']) || 'Казахстан',
                        oblast: getVal(row, ['Область']) || '',
                        city,
                        street: getVal(row, ['Улица']) || '',
                        houseNumber: getVal(row, ['Дом']) || '',
                    },
                });
                console.log(`[#${idx}] Database record created: ${ticket.id}`);

                // 2. AI + Geo in parallel
                const address = `${getVal(row, ['Страна']) || 'Казахстан'}, ${getVal(row, ['Область'])}, ${city}, ${getVal(row, ['Улица'])} ${getVal(row, ['Дом'])}`.trim();

                console.log(`[#${idx}] Requesting AI analysis for description: "${description.slice(0, 30)}..."`);
                const [aiResult, geoResult] = await Promise.all([
                    this.aiService.analyzeTicket(description),
                    this.geoService.getCoordinates(address),
                ]);

                // 3. Save analysis
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
                console.log(`[#${idx}] AI Analysis saved: ${aiResult.type} | P${aiResult.priority} | Geo: ${geoResult ? 'MATCH' : 'NOT FOUND'}`);

                // 4. Route
                const routing = await this.routingService.findBestManager(ticket.id, segment, aiResult);
                console.log(`[#${idx}] Router decision: ${routing.reason}`);

                // 5. Assign
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: {
                        managerId: routing.managerId,
                        officeId: routing.officeId,
                    },
                });

                // 6. Log assignment
                await prisma.assignmentLog.create({
                    data: {
                        ticketId: ticket.id,
                        toManagerId: routing.managerId,
                        assignedById: routing.managerId,
                        reason: routing.reason,
                    },
                });

                // 7. Increment active count
                await this.managerRepo.updateActiveCount(routing.managerId, 1);

                console.log(`[#${idx}] ✅ Successfully assigned to ${routing.managerId}`);

                processed++;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.stack : 'Unknown error';
                console.error(`[#${idx}] ❌ Failed to process row:`, message);
                failed++;
            }
        }

        return { processed, failed };
    }

    async getTickets(
        filters: { managerId?: string; officeId?: string; segment?: string },
        pagination: { skip: number; take: number },
        user: UserContext
    ) {
        const scopedFilters: any = { ...filters };
        if (user.role === 'MANAGER') scopedFilters.managerId = user.id;
        else if (user.role === 'OFFICE_ADMIN' && user.officeId) scopedFilters.officeId = user.officeId;

        return this.ticketRepo.findMany(scopedFilters, pagination);
    }

    async getTicketById(id: string) {
        return this.ticketRepo.findById(id);
    }
}
