import prisma from '../config/database.js';

type Position = 'Специалист' | 'Ведущий_специалист' | 'Главный_специалист';
type Skill = 'VIP' | 'ENG' | 'KZ';

function mapPosition(val: string): Position {
    const v = val.toUpperCase().trim().replace(/\s+/g, '_');
    if (v.includes('ГЛАВН') || v.includes('LEAD')) return 'Главный_специалист';
    if (v.includes('ВЕДУЩ') || v.includes('SENIOR')) return 'Ведущий_специалист';
    return 'Специалист';
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
                const activeTicketsRaw = row['Количество обращений в работе'] ?? row['ActiveTickets'] ?? '0';

                if (!fullName) { errors.push('Нет ФИО'); failed++; continue; }
                if (!officeName) { errors.push(`${fullName}: нет Офис`); failed++; continue; }

                const office = await prisma.office.findFirst({ where: { name: officeName } });
                if (!office) { errors.push(`Офис "${officeName}" не найден`); failed++; continue; }

                await prisma.manager.create({
                    data: {
                        fullName,
                        position: mapPosition(positionRaw) as any,
                        officeId: office.id,
                        skills: mapSkills(skillsRaw),
                        activeTicketCount: parseInt(activeTicketsRaw) || 0,
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
