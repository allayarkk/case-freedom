import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';

export class ManagerRepository {
    async findMany(filters: { officeId?: string }) {
        const where: Prisma.ManagerWhereInput = {};
        if (filters.officeId) where.officeId = filters.officeId;

        return prisma.manager.findMany({
            where,
            include: {
                office: true,
                _count: {
                    select: { tickets: true },
                },
            },
        });
    }

    async findById(id: string) {
        return prisma.manager.findUnique({
            where: { id },
            include: {
                office: true,
            },
        });
    }

    async updateActiveCount(id: string, delta: number): Promise<void> {
        await prisma.manager.update({
            where: { id },
            data: {
                activeTicketCount: {
                    increment: delta,
                },
            },
        });
    }
}
