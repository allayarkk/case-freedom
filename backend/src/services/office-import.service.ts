import prisma from '../config/database.js';

export class OfficeImportService {
    async importFromCSV(rows: Record<string, string>[]) {
        let created = 0, skipped = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                const name = row['Офис'] || '';
                const address = row['Адрес'] || '';

                if (!name) { errors.push('Пропущено название офиса'); skipped++; continue; }

                const exists = await prisma.office.findFirst({ where: { name } });
                if (exists) { skipped++; continue; }

                await prisma.office.create({
                    data: {
                        name,
                        address,
                    },
                });
                created++;
            } catch (err: any) {
                errors.push(err.message || 'Ошибка импорта');
                skipped++;
            }
        }

        return { created, skipped, errors };
    }
}
