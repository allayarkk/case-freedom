import prisma from '../config/database.js';

export class AnalyticsService {
    async getKanbanStats(officeId?: string) {
        const where = officeId ? { ticket: { officeId } } : {};
        const stats = await prisma.ticketAnalysis.groupBy({ by: ['type'], where, _count: { _all: true } });
        return stats.map(s => ({ type: s.type, count: s._count._all }));
    }

    async getWorkload() {
        return prisma.manager.findMany({
            select: {
                id: true, fullName: true, activeTicketCount: true, position: true,
                office: { select: { name: true } },
            },
            orderBy: { activeTicketCount: 'desc' },
        });
    }
}
