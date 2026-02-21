import { GeoService } from './geo.service.js';
import prisma from '../config/database.js';
import type { AIAnalysisResult } from './ai.service.js';

interface RoutingResult {
    managerId: string;
    officeId: string;
    reason: string;
}

/**
 * Escalation Matrix — определяет минимальную должность менеджера
 * на основе типа обращения и тональности.
 *
 * SPECIALIST < SENIOR_SPECIALIST < LEAD_SPECIALIST
 */
const POSITION_HIERARCHY: Record<string, number> = {
    SPECIALIST: 1,
    SENIOR_SPECIALIST: 2,
    LEAD_SPECIALIST: 3,
};

function positionRank(pos: string): number {
    return POSITION_HIERARCHY[pos] ?? 1;
}

/**
 * Определяет минимальную требуемую должность по типу обращения.
 */
function getMinPositionForType(type: string): string {
    switch (type) {
        case 'FRAUD':
            return 'LEAD_SPECIALIST';        // мошенничество → главный специалист
        case 'CLAIM':
            return 'SENIOR_SPECIALIST';       // претензия с юр.риском → ведущий+
        case 'DATA_CHANGE':
            return 'SENIOR_SPECIALIST';       // смена данных — чувствительная операция
        case 'COMPLAINT':
            return 'SPECIALIST';              // жалоба → спец, но может эскалироваться
        case 'APP_MALFUNCTION':
            return 'SPECIALIST';
        case 'CONSULTATION':
            return 'SPECIALIST';
        case 'SPAM':
            return 'SPECIALIST';
        default:
            return 'SPECIALIST';
    }
}

/**
 * Эскалация по тональности и приоритету:
 * Если NEGATIVE + высокий приоритет → повысить минимальную должность.
 */
function escalateByContext(
    basePosition: string,
    sentiment: string,
    priority: number,
    segment: string
): string {
    let minRank = positionRank(basePosition);

    // Негатив + высокий приоритет → минимум ведущий специалист
    if (sentiment === 'NEGATIVE' && priority >= 8) {
        minRank = Math.max(minRank, positionRank('SENIOR_SPECIALIST'));
    }

    // FRAUD или CLAIM от VIP → максимальная эскалация
    if (segment === 'VIP' && (sentiment === 'NEGATIVE')) {
        minRank = Math.max(minRank, positionRank('SENIOR_SPECIALIST'));
    }

    // Приоритет 10 → всегда главный специалист
    if (priority >= 10) {
        minRank = Math.max(minRank, positionRank('LEAD_SPECIALIST'));
    }

    const entries = Object.entries(POSITION_HIERARCHY);
    return entries.find(([, rank]) => rank === minRank)?.[0] ?? 'SPECIALIST';
}

export class RoutingService {
    constructor(private geo: GeoService) { }

    /**
     * Каскад маршрутизации FIRE:
     * 1. Определение должности (escalation matrix)
     * 2. Гео → ближайший офис (fallback: 50/50 по нагрузке)
     * 3. Навыки → VIP/PRIORITY, язык KZ/ENG
     * 4. Должность → фильтр по минимальной позиции
     * 5. Dynamic Round Robin → 2 наименее загруженных, чередование
     */
    async findBestManager(
        ticketId: string,
        segment: string,
        analysis: AIAnalysisResult
    ): Promise<RoutingResult> {
        const offices = await prisma.office.findMany();
        if (!offices.length) throw new Error('No offices found. Import offices first.');

        const reasons: string[] = [];

        // 0. Escalation — определяем минимальную должность
        const basePosition = getMinPositionForType(analysis.type);
        const requiredPosition = escalateByContext(
            basePosition,
            analysis.sentiment,
            analysis.priority,
            segment
        );
        reasons.push(`Эскалация: ${analysis.type} → мин. ${requiredPosition}`);

        // 1. Географический фильтр
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { country: true } });
        const ticketGeo = await prisma.ticketAnalysis.findUnique({ where: { ticketId } });

        let targetOfficeId: string;

        // Проверяем зарубежного клиента
        const country = (ticket?.country || '').trim().toLowerCase();
        const isKazakhstan = !country ||
            country === 'казахстан' ||
            country === 'kazakhstan' ||
            country === 'kz' ||
            country === 'kaz';

        if (!isKazakhstan) {
            // Зарубежный клиент → Астана или Алматы по нагрузке
            const fallbacks = offices.filter(o =>
                o.name === 'Астана' || o.name === 'Алматы'
            );

            if (fallbacks.length >= 2) {
                // Считаем нагрузку по офисам
                const loads = await Promise.all(
                    fallbacks.map(async (o) => ({
                        office: o,
                        load: await prisma.manager.aggregate({
                            where: { officeId: o.id },
                            _sum: { activeTicketCount: true },
                        }),
                    }))
                );
                const sorted = loads.sort(
                    (a, b) => (a.load._sum.activeTicketCount ?? 0) - (b.load._sum.activeTicketCount ?? 0)
                );
                targetOfficeId = sorted[0].office.id;
                reasons.push(`Гео: зарубежный клиент (${ticket?.country}) → ${sorted[0].office.name} (меньше нагрузка: ${sorted[0].load._sum.activeTicketCount ?? 0})`);
            } else {
                const chosen = fallbacks[0] ?? offices[0];
                targetOfficeId = chosen.id;
                reasons.push(`Гео: зарубежный клиент → ${chosen.name}`);
            }
        } else if (ticketGeo?.latitude && ticketGeo?.longitude) {
            const nearest = this.findNearestOffice(
                { lat: ticketGeo.latitude, lng: ticketGeo.longitude },
                offices
            );
            targetOfficeId = nearest.id;
            reasons.push(`Гео: ближайший офис ${nearest.name}`);
        } else {
            // Fallback 50/50 — выбираем по нагрузке между Астана/Алматы
            const fallbacks = offices.filter(o => o.name === 'Астана' || o.name === 'Алматы');

            if (fallbacks.length >= 2) {
                const loads = await Promise.all(
                    fallbacks.map(async (o) => ({
                        office: o,
                        load: await prisma.manager.aggregate({
                            where: { officeId: o.id },
                            _sum: { activeTicketCount: true },
                        }),
                    }))
                );
                const sorted = loads.sort(
                    (a, b) => (a.load._sum.activeTicketCount ?? 0) - (b.load._sum.activeTicketCount ?? 0)
                );
                targetOfficeId = sorted[0].office.id;
                reasons.push(`Гео: fallback → ${sorted[0].office.name} (по нагрузке, правило 50/50)`);
            } else {
                const chosen = fallbacks.length ? fallbacks[Math.floor(Math.random() * fallbacks.length)] : offices[0];
                targetOfficeId = chosen.id;
                reasons.push(`Гео: fallback → ${chosen.name}`);
            }
        }

        // 2. Загружаем менеджеров целевого офиса (ДИНАМИЧЕСКАЯ сортировка по нагрузке)
        const managers = await prisma.manager.findMany({
            where: { officeId: targetOfficeId },
            orderBy: { activeTicketCount: 'asc' },
        });

        if (!managers.length) {
            // Fallback: берём любого менеджера из другого офиса
            const any = await prisma.manager.findFirst({ orderBy: { activeTicketCount: 'asc' } });
            if (!any) throw new Error('No managers found. Import managers first.');
            reasons.push(`Нет менеджеров в офисе → fallback на ${any.fullName}`);
            return { managerId: any.id, officeId: any.officeId, reason: reasons.join(' | ') };
        }

        // 3. Фильтр по навыкам
        let eligible = managers.filter(m => {
            // Навык VIP
            if ((segment === 'VIP' || segment === 'PRIORITY') && !m.skills.includes('VIP')) return false;
            // Навык языка
            if (analysis.language === 'KZ' && !m.skills.includes('KZ')) return false;
            if (analysis.language === 'ENG' && !m.skills.includes('ENG')) return false;
            return true;
        });

        if (!eligible.length) {
            // Skill fallback — берём всех менеджеров офиса
            eligible = managers;
            reasons.push(`Навыки: нет точного совпадения → skill fallback`);
        } else {
            reasons.push(`Навыки: ${eligible.length} подходящих`);
        }

        // 4. Фильтр по должности (escalation)
        const requiredRank = positionRank(requiredPosition);
        let positionFiltered = eligible.filter(m => positionRank(m.position) >= requiredRank);

        if (!positionFiltered.length) {
            // Нет менеджера с нужной должностью → берём максимально близкого
            positionFiltered = eligible;
            reasons.push(`Должность: нет ${requiredPosition} → fallback на доступных`);
        } else {
            reasons.push(`Должность: ${positionFiltered.length} с позицией ≥ ${requiredPosition}`);
        }

        // 5. Dynamic Round Robin среди top-2 наименее загруженных
        // Пересортировка уже встроена — managers загружены orderBy activeTicketCount ASC
        const top2 = positionFiltered.slice(0, 2);

        // Используем глобальный счётчик для чередования внутри пары
        const rrKey = `${targetOfficeId}_${requiredPosition}`;
        const idx = rrCounters.get(rrKey) ?? 0;
        const selected = top2[idx % top2.length];
        rrCounters.set(rrKey, idx + 1);

        reasons.push(`Round Robin → ${selected.fullName} (загрузка: ${selected.activeTicketCount})`);

        return {
            managerId: selected.id,
            officeId: targetOfficeId,
            reason: reasons.join(' | '),
        };
    }

    private findNearestOffice(
        client: { lat: number; lng: number },
        offices: Array<{ id: string; name: string; latitude: number | null; longitude: number | null }>
    ) {
        let minDist = Infinity;
        let nearest = offices[0];

        for (const o of offices) {
            if (o.latitude != null && o.longitude != null) {
                const d = this.geo.calculateDistance(client, { lat: o.latitude, lng: o.longitude });
                if (d < minDist) { minDist = d; nearest = o; }
            }
        }
        return nearest;
    }
}

/** In-memory Round Robin counter (per office+position) */
const rrCounters = new Map<string, number>();
