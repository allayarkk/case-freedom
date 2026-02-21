import prisma from '../config/database.js';

export class OfficeImportService {
    async importFromCSV(rows: Record<string, string>[]): Promise<{ created: number; skipped: number; errors: string[] }> {
        let created = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                const name = row['Название'] ?? row['Name'] ?? row['name'] ?? row['Офис'] ?? '';
                const address = row['Адрес'] ?? row['Address'] ?? row['address'] ?? '';
                const latStr = row['Широта'] ?? row['Latitude'] ?? row['lat'] ?? '';
                const lngStr = row['Долгота'] ?? row['Longitude'] ?? row['lng'] ?? row['lon'] ?? '';

                if (!name) { errors.push('Пропущено: нет Названия'); skipped++; continue; }

                // Skip duplicates
                const existing = await prisma.office.findFirst({ where: { name } });
                if (existing) { skipped++; continue; }

                await prisma.office.create({
                    data: {
                        name,
                        address,
                        latitude: latStr ? parseFloat(latStr) : null,
                        longitude: lngStr ? parseFloat(lngStr) : null,
                    },
                });
                created++;
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                errors.push(`Ошибка: ${msg}`);
                skipped++;
            }
        }

        return { created, skipped, errors };
    }
}
