import prisma from '../config/database.js';

type Position = 'SPECIALIST' | 'SENIOR_SPECIALIST' | 'LEAD_SPECIALIST';
type Skill = 'VIP' | 'ENG' | 'KZ';

function mapPosition(val: string): Position {
    const v = val.toUpperCase().trim().replace(/\s+/g, '_');
    if (v === 'LEAD_SPECIALIST' || v === 'ГЛАВНЫЙ_СПЕЦИАЛИСТ' || v === 'ГЛАВНЫЙ СПЕЦИАЛИСТ' || v.startsWith('LEAD')) {
        return 'LEAD_SPECIALIST';
    }
    if (v === 'SENIOR_SPECIALIST' || v === 'ВЕДУЩИЙ_СПЕЦИАЛИСТ' || v === 'ВЕДУЩИЙ СПЕЦИАЛИСТ' || v.startsWith('SENIOR') || v.startsWith('ВЕДУЩ')) {
        return 'SENIOR_SPECIALIST'; // We don't have this in enum, map to LEAD
    }
    return 'SPECIALIST';
}

function mapSkills(val: string): Skill[] {
    const skills: Skill[] = [];
    const parts = val.toUpperCase().split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
        if (p === 'VIP') skills.push('VIP');
        if (p === 'ENG' || p === 'ENGLISH') skills.push('ENG');
        if (p === 'KZ' || p === 'KAZAKH' || p === 'КАЗАХСКИЙ') skills.push('KZ');
    }
    return [...new Set(skills)];
}

export class ManagerImportService {
    async importFromCSV(rows: Record<string, string>[]): Promise<{ created: number; failed: number; errors: string[] }> {
        let created = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                const fullName = row['ФИО'] ?? row['Имя'] ?? row['Name'] ?? row['fullName'] ?? '';
                const officeName = row['Офис'] ?? row['Office'] ?? row['officeName'] ?? '';
                const positionRaw = row['Должность'] ?? row['Position'] ?? row['position'] ?? 'SPECIALIST';
                const skillsRaw = row['Навыки'] ?? row['Skills'] ?? row['skills'] ?? '';

                if (!fullName) { errors.push('Пропущено: нет ФИО'); failed++; continue; }
                if (!officeName) { errors.push(`Пропущено ${fullName}: нет Офис`); failed++; continue; }

                const office = await prisma.office.findFirst({ where: { name: officeName } });
                if (!office) {
                    errors.push(`Офис "${officeName}" не найден. Сначала импортируйте офисы.`);
                    failed++;
                    continue;
                }

                const position = mapPosition(positionRaw);
                const skills = mapSkills(skillsRaw);

                await prisma.manager.create({
                    data: {
                        fullName,
                        position,
                        userRole: 'MANAGER',
                        officeId: office.id,
                        skills,
                    },
                });
                created++;
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                errors.push(`Ошибка: ${msg}`);
                failed++;
            }
        }

        return { created, failed, errors };
    }
}
