import prisma from '../config/database.js';

type Position = 'SPECIALIST' | 'SENIOR_SPECIALIST' | 'LEAD_SPECIALIST';
type Skill = 'VIP' | 'ENG' | 'KZ';

function mapPosition(val: string): Position {
    const v = val.toUpperCase().trim().replace(/\s+/g, '_');
    if (v.startsWith('LEAD') || v.includes('ГЛАВН')) return 'LEAD_SPECIALIST';
    if (v.startsWith('SENIOR') || v.startsWith('ВЕДУЩ')) return 'SENIOR_SPECIALIST';
    return 'SPECIALIST';
}

function mapSkills(val: string): Skill[] {
    const parts = val.toUpperCase().split(/[\s,;]+/).filter(Boolean);
    const skills: Skill[] = [];
    for (const p of parts) {
        if (p === 'VIP') skills.push('VIP');
        if (p === 'ENG' || p === 'ENGLISH') skills.push('ENG');
        if (p === 'KZ' || p === 'KAZAKH' || p === 'КАЗАХСКИЙ') skills.push('KZ');
    }
    return [...new Set(skills)];
}

export class ManagerImportService {
    async importFromCSV(rows: Record<string, string>[]) {
        let created = 0, failed = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                const fullName = row['ФИО'] ?? row['Имя'] ?? row['Name'] ?? '';
                const officeName = row['Офис'] ?? row['Office'] ?? '';
                const positionRaw = row['Должность'] ?? row['Position'] ?? 'SPECIALIST';
                const skillsRaw = row['Навыки'] ?? row['Skills'] ?? '';

                if (!fullName) { errors.push('Нет ФИО'); failed++; continue; }
                if (!officeName) { errors.push(`${fullName}: нет Офис`); failed++; continue; }

                const office = await prisma.office.findFirst({ where: { name: officeName } });
                if (!office) { errors.push(`Офис "${officeName}" не найден`); failed++; continue; }

                await prisma.manager.create({
                    data: {
                        fullName,
                        position: mapPosition(positionRaw),
                        userRole: 'MANAGER',
                        officeId: office.id,
                        skills: mapSkills(skillsRaw),
                    },
                });
                created++;
            } catch (err: unknown) {
                errors.push(err instanceof Error ? err.message : 'Unknown error');
                failed++;
            }
        }

        return { created, failed, errors };
    }
}
