import prisma from '../config/database.js';

type Position = 'Специалист' | 'Ведущий_специалист' | 'Главный_специалист';
type Skill = 'VIP' | 'ENG' | 'KZ';

function mapPosition(val: string): Position | null {
    if (!val) return null;
    const v = val.toUpperCase().trim().replace(/\s+/g, '_');
    if (v.includes('ГЛАВН')) return 'Главный_специалист';
    if (v.includes('ВЕДУЩ')) return 'Ведущий_специалист';
    if (v.includes('СПЕЦИАЛ')) return 'Специалист';
    return null;
}

function mapSkills(val: string): Skill[] {
    const parts = val.toUpperCase().split(/[\s,;]+/).filter(Boolean);
    const skills: Skill[] = [];
    for (const p of parts) {
        if (p === 'VIP') skills.push('VIP');
        if (p === 'ENG') skills.push('ENG');
        if (p === 'KZ') skills.push('KZ');
    }
    return [...new Set(skills)];
}

export class ManagerImportService {
    async importFromCSV(rows: Record<string, string>[]) {
        let created = 0, failed = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                const fullName = row['ФИО'];
                const officeName = row['Офис'];
                const positionRaw = row['Должность'];
                const skillsRaw = row['Навыки'] || '';
                const activeCount = parseInt(row['Количество обращений в работе']) || 0;

                if (!fullName) { errors.push('Пропущено ФИО'); failed++; continue; }
                if (!officeName) { errors.push(`${fullName}: пропущена колонка Офис`); failed++; continue; }
                if (!positionRaw) { errors.push(`${fullName}: пропущена Должность`); failed++; continue; }

                const position = mapPosition(positionRaw);
                if (!position) { errors.push(`${fullName}: неизвестная должность "${positionRaw}"`); failed++; continue; }

                const office = await prisma.office.findFirst({ where: { name: officeName } });
                if (!office) { errors.push(`Офис "${officeName}" не найден`); failed++; continue; }

                await prisma.manager.create({
                    data: {
                        fullName,
                        position: position as any,
                        officeId: office.id,
                        skills: mapSkills(skillsRaw),
                        activeTicketCount: activeCount,
                    },
                });
                created++;
            } catch (err: any) {
                errors.push(err.message || 'Ошибка');
                failed++;
            }
        }

        return { created, failed, errors };
    }
}
