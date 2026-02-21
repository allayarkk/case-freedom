import prisma from '../config/database.js';

export class OfficeRepository {
    async findAll() {
        return prisma.office.findMany({
            include: {
                _count: { select: { managers: true, tickets: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string) {
        return prisma.office.findUnique({ where: { id } });
    }

    async findByName(name: string) {
        return prisma.office.findFirst({ where: { name } });
    }

    async createMany(
        data: Array<{
            name: string;
            address: string;
            latitude?: number | null;
            longitude?: number | null;
        }>
    ) {
        let created = 0;
        let skipped = 0;

        for (const item of data) {
            const existing = await prisma.office.findFirst({ where: { name: item.name } });
            if (existing) {
                skipped++;
                continue;
            }
            await prisma.office.create({ data: item });
            created++;
        }

        return { created, skipped };
    }
}
