import prisma from '../config/database.js';

interface AnalysisRecord {
    aiDuration: number | null;
    geoDuration: number | null;
    routingDuration: number | null;
    totalDuration: number | null;
}

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

    // --- Import History & Performance ---

    async createImportSession(totalTickets: number, name?: string) {
        return prisma.importSession.create({
            data: {
                totalTickets,
                name: name || `Import ${new Date().toLocaleString()}`,
                status: 'PROCESSING'
            }
        });
    }

    async updateImportSessionStatus(id: string, status: string) {
        return prisma.importSession.update({
            where: { id },
            data: { status }
        });
    }

    async getImportHistory() {
        return prisma.importSession.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { tickets: true }
                }
            }
        });
    }

    async getImportSessionDetail(id: string) {
        const session = await prisma.importSession.findUnique({
            where: { id },
            include: {
                tickets: {
                    include: {
                        analysis: true,
                        manager: true,
                        office: true
                    }
                }
            }
        });

        if (!session) return null;

        // Calculate averages
        const analyses = session.tickets.map(t => t.analysis).filter((a): a is any => !!a);
        const count = analyses.length || 1;

        const avgAi = analyses.reduce((acc: number, a: any) => acc + (a.aiDuration || 0), 0) / count;
        const avgGeo = analyses.reduce((acc: number, a: any) => acc + (a.geoDuration || 0), 0) / count;
        const avgRouting = analyses.reduce((acc: number, a: any) => acc + (a.routingDuration || 0), 0) / count;
        const avgTotal = analyses.reduce((acc: number, a: any) => acc + (a.totalDuration || 0), 0) / count;

        return {
            ...session,
            stats: {
                avgAi: Math.round(avgAi),
                avgGeo: Math.round(avgGeo),
                avgRouting: Math.round(avgRouting),
                avgTotal: Math.round(avgTotal)
            }
        };
    }
}
