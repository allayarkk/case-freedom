import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';

export class TicketRepository {
    async create(data: Prisma.TicketCreateInput) {
        return prisma.ticket.create({
            data,
            include: {
                analysis: true,
            },
        });
    }

    async findMany(
        filters: {
            managerId?: string;
            officeId?: string;
            segment?: string;
        },
        pagination: { skip: number; take: number }
    ) {
        const where: Prisma.TicketWhereInput = {};
        if (filters.managerId) where.managerId = filters.managerId;
        if (filters.officeId) where.officeId = filters.officeId;
        if (filters.segment) where.segment = filters.segment as any;

        const [tickets, total] = await Promise.all([
            prisma.ticket.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                include: {
                    analysis: true,
                    manager: true,
                    office: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.ticket.count({ where }),
        ]);

        return { tickets, total };
    }

    async findById(id: string) {
        return prisma.ticket.findUnique({
            where: { id },
            include: {
                analysis: true,
                manager: true,
                office: true,
                assignmentLogs: {
                    include: {
                        fromManager: true,
                        toManager: true,
                        assignedBy: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    async update(id: string, data: Prisma.TicketUpdateInput) {
        return prisma.ticket.update({
            where: { id },
            data,
            include: {
                analysis: true,
            },
        });
    }
}
