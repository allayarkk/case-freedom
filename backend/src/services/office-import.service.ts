import prisma from '../config/database.js';
import { GeoService } from './geo.service.js';

export class OfficeImportService {
    private geo = new GeoService();

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

                let latitude = null;
                let longitude = null;
                try {
                    const { coords } = await this.geo.getCoordinatesWithTrace({
                        country: 'Казахстан',
                        oblast: '',
                        city: name, // Название офиса у вас совпадает с городом
                        street: address,
                        houseNumber: ''
                    });
                    if (coords) {
                        latitude = coords.lat;
                        longitude = coords.lng;
                    }
                } catch (geoErr) {
                    console.warn(`[OfficeImport] Не удалось найти гео-координаты для офиса ${name}`);
                }

                await prisma.office.create({
                    data: {
                        name,
                        address,
                        latitude,
                        longitude
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
