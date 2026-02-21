import prisma from '../config/database.js';

export class OfficeRepository {
    async findAll() {
        return prisma.office.findMany({
            include: { _count: { select: { managers: true, tickets: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string) {
        return prisma.office.findUnique({ where: { id } });
    }

    async findByName(name: string) {
        return prisma.office.findFirst({ where: { name } });
    }
}
