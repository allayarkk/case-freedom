import prisma from '../config/database.js';

export class OfficeImportService {
    async importFromCSV(rows: Record<string, string>[]) {
        let created = 0, skipped = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                const name = row['Название'] ?? row['Name'] ?? row['Офис'] ?? '';
                const address = row['Адрес'] ?? row['Address'] ?? '';
                const lat = row['Широта'] ?? row['Latitude'] ?? '';
                const lng = row['Долгота'] ?? row['Longitude'] ?? row['lon'] ?? '';

                if (!name) { errors.push('Нет названия'); skipped++; continue; }

                const exists = await prisma.office.findFirst({ where: { name } });
                if (exists) { skipped++; continue; }

                await prisma.office.create({
                    data: {
                        name, address,
                        latitude: lat ? parseFloat(lat) : null,
                        longitude: lng ? parseFloat(lng) : null,
                    },
                });
                created++;
            } catch (err: unknown) {
                errors.push(err instanceof Error ? err.message : 'Unknown error');
                skipped++;
            }
        }

        return { created, skipped, errors };
    }
}
