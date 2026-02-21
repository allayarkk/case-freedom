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

        for (const row of csvData) {
            try {
                const segment = mapSegment(row['Сегмент клиента'] ?? row['Сегмент']);
                const description = row['Описание'] ?? '';
                const country = row['Страна'] ?? '';
                const oblast = row['Область'] ?? '';
                const city = row['Населённый пункт'] ?? row['Город'] ?? '';
                const street = row['Улица'] ?? '';
                const houseNumber = row['Дом'] ?? '';

                // 1. Create ticket
                const ticket = await prisma.ticket.create({
                    data: {
                        clientGuid: row['GUID клиента'] ?? row['GUID'] ?? '',
                        gender: row['Пол клиента'] ?? row['Пол'] ?? '',
                        dateOfBirth: row['Дата рождения'] ? new Date(row['Дата рождения']) : new Date(),
                        description,
                        attachments: row['Вложения'] ?? null,
                        segment,
                        country,
                        oblast,
                        city,
                        street,
                        houseNumber,
                    },
                });

                // 2. AI + Geo in parallel
                const address = `${country}, ${oblast}, ${city}, ${street} ${houseNumber}`.trim();
                const [aiResult, geoResult] = await Promise.all([
                    this.aiService.analyzeTicket(description),
                    this.geoService.getCoordinates(address),
                ]);

                // 3. Save analysis
                const analysis = await prisma.ticketAnalysis.create({
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

                // 4. Route
                const routing = await this.routingService.findBestManager(ticket.id, segment, aiResult);

                // 5. Assign
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: {
                        managerId: routing.managerId,
                        officeId: routing.officeId,
                    },
                });

                // 6. Log assignment (manager assigns to themselves for MVP — no auth user)
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

                processed++;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                console.error(`Failed to process row:`, message);
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
        const scopedFilters = { ...filters };
        if (user.role === 'MANAGER') scopedFilters.managerId = user.id;
        else if (user.role === 'OFFICE_ADMIN' && user.officeId) scopedFilters.officeId = user.officeId;

        return this.ticketRepo.findMany(scopedFilters, pagination);
    }

    async getTicketById(id: string) {
        return this.ticketRepo.findById(id);
    }
}
