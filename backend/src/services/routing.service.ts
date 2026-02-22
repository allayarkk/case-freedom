import { GeoService } from './geo.service.js';
import prisma from '../config/database.js';
import type { AIAnalysisResult } from './ai.service.js';

interface RoutingResult {
    managerId: string;
    officeId: string;
    reason: string;
    trace: any[];
}

/**
 * Escalation Matrix — определяет минимальную должность менеджера
 * на основе типа обращения и тональности.
 */
const POSITION_HIERARCHY: Record<string, number> = {
    Специалист: 1,
    Ведущий_специалист: 2,
    Главный_специалист: 3,
};

function positionRank(pos: string): number {
    return POSITION_HIERARCHY[pos] ?? 1;
}

function getMinPositionForType(type: string): string {
    switch (type) {
        case 'Мошеннические_действия': return 'Главный_специалист';
        case 'Претензия': return 'Ведущий_специалист';
        case 'Смена_данных': return 'Главный_специалист';
        case 'НЕ_РАЗОБРАНО': return 'Специалист';
        default: return 'Специалист';
    }
}

function escalateByContext(
    basePosition: string,
    sentiment: string,
    priority: number,
    segment: string
): string {
    let minRank = positionRank(basePosition);
    if (sentiment === 'Негативный' && priority >= 8) minRank = Math.max(minRank, positionRank('Ведущий_специалист'));
    if (segment === 'VIP' && sentiment === 'Негативный') minRank = Math.max(minRank, positionRank('Ведущий_специалист'));
    if (priority >= 10) minRank = Math.max(minRank, positionRank('Главный_специалист'));

    const entries = Object.entries(POSITION_HIERARCHY);
    return entries.find(([, rank]) => rank === minRank)?.[0] ?? 'Специалист';
}

export class RoutingService {
    constructor(private geo: GeoService) { }

    async findBestManager(
        ticketId: string,
        segment: string,
        analysis: AIAnalysisResult
    ): Promise<RoutingResult> {
        const trace: any[] = [];
        const offices = await prisma.office.findMany();
        if (!offices.length) throw new Error('No offices found. Import offices first.');

        const reasons: string[] = [];

        // 0. ESCALATION
        const basePosition = getMinPositionForType(analysis.type);
        const requiredPosition = escalateByContext(
            basePosition,
            analysis.sentiment,
            analysis.priority,
            segment
        );
        trace.push({
            stage: 'ESCALATION',
            input: { type: analysis.type, sentiment: analysis.sentiment, priority: analysis.priority, segment },
            decision: { basePosition, requiredPosition },
            reason: `Эскалация: ${analysis.type} → мин. ${requiredPosition}`
        });
        reasons.push(`Эскалация: ${analysis.type} → мин. ${requiredPosition}`);

        // 1. GEO FILTERING
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { country: true } });
        const ticketGeo = await prisma.ticketAnalysis.findUnique({ where: { ticketId } });

        let targetOfficeId: string;
        const country = (ticket?.country || '').trim().toLowerCase();
        const isKazakhstan = ['казахстан', 'kazakhstan', 'kz', 'kaz'].includes(country);

        if (!isKazakhstan) {
            const hqOffices = offices.filter(o => ['Астана', 'Алматы'].includes(o.name));
            const loads = await Promise.all(hqOffices.map(async o => ({
                id: o.id,
                name: o.name,
                load: (await prisma.manager.aggregate({ where: { officeId: o.id }, _sum: { activeTicketCount: true } }))._sum.activeTicketCount ?? 0
            })));
            const sorted = loads.sort((a, b) => a.load - b.load);
            targetOfficeId = sorted[0].id;
            trace.push({
                stage: 'GEO_ROUTING',
                type: 'FOREIGN_CLIENT',
                input: { country },
                analysis: `Клиент из страны "${country}". Согласно правилам, зарубежные клиенты направляются в головные офисы (Астана/Алматы). Выбран офис с минимальной нагрузкой.`,
                office_loads: loads,
                decision: { targetOffice: sorted[0].name, officeId: targetOfficeId }
            });
            reasons.push(`Гео: зарубежный клиент (${country}) → ${sorted[0].name}`);
        } else if (ticketGeo?.latitude && ticketGeo?.longitude) {
            const clientCoords = { lat: ticketGeo.latitude, lng: ticketGeo.longitude };
            const distances = offices.filter(o => o.latitude && o.longitude).map(o => ({
                id: o.id,
                name: o.name,
                distance: parseFloat(this.geo.calculateDistance(clientCoords, { lat: o.latitude!, lng: o.longitude! }).toFixed(2)),
                coordinates: { lat: o.latitude, lng: o.longitude }
            })).sort((a, b) => a.distance - b.distance);

            targetOfficeId = distances[0].id;
            trace.push({
                stage: 'GEO_ROUTING',
                type: 'NEAREST_PROXIMITY',
                input: clientCoords,
                analysis: `Найдены координаты клиента. Расчет расстояний до всех ${offices.length} офисов.`,
                distances,
                decision: { targetOffice: distances[0].name, distance: distances[0].distance, officeId: targetOfficeId }
            });
            reasons.push(`Гео: ближайший офис ${distances[0].name} (${distances[0].distance}km)`);
        } else {
            const hqOffices = offices.filter(o => ['Астана', 'Алматы'].includes(o.name));
            const loads = await Promise.all(hqOffices.map(async o => ({
                id: o.id,
                name: o.name,
                load: (await prisma.manager.aggregate({ where: { officeId: o.id }, _sum: { activeTicketCount: true } }))._sum.activeTicketCount ?? 0
            })));
            const sorted = loads.sort((a, b) => a.load - b.load);
            targetOfficeId = sorted[0].id;
            trace.push({
                stage: 'GEO_ROUTING',
                type: 'FALLBACK_LOAD_BALANCING',
                input: 'NO_COORDINATES',
                analysis: 'Координаты клиента не определены. Применяется стратегия балансировки нагрузки между центральными узлами (Астана/Алматы).',
                office_loads: loads,
                decision: { targetOffice: sorted[0].name, officeId: targetOfficeId }
            });
            reasons.push(`Гео: fallback нагрузки → ${sorted[0].name}`);
        }

        // 2. SKILL FILTERING
        const managers = await prisma.manager.findMany({
            where: { officeId: targetOfficeId },
            include: { office: true },
            orderBy: { activeTicketCount: 'asc' },
        });

        if (!managers.length) {
            const any = await prisma.manager.findFirst({ orderBy: { activeTicketCount: 'asc' }, include: { office: true } });
            if (!any) throw new Error('No managers in system');
            trace.push({ stage: 'SKILL_FILTER', status: 'NO_MANAGERS_IN_OFFICE', fallback: any.fullName });
            return { managerId: any.id, officeId: any.officeId, reason: reasons.join(' | ') + ` | Нет менеджеров в офисе → fallback на ${any.fullName}`, trace };
        }

        const mapManager = (m: any) => ({
            id: m.id,
            name: m.fullName,
            position: m.position,
            skills: m.skills,
            activeTickets: m.activeTicketCount,
            office: m.office?.name
        });

        let eligible = managers.filter(m => {
            if ((segment === 'VIP' || segment === 'PRIORITY') && !m.skills.includes('VIP')) return false;
            if (analysis.language === 'KZ' && !m.skills.includes('KZ')) return false;
            if (analysis.language === 'ENG' && !m.skills.includes('ENG')) return false;
            return true;
        });

        const skillTrace = {
            stage: 'SKILL_FILTER',
            input: { segment, language: analysis.language },
            analysis: `Проверка ${managers.length} менеджеров на соответствие сегменту (${segment}) и языку (${analysis.language}).`,
            candidates_before: managers.map(mapManager),
            candidates_after: eligible.map(mapManager),
            was_fallback: eligible.length === 0
        };

        if (!eligible.length) {
            eligible = managers;
            reasons.push(`Навыки: skill fallback`);
            (skillTrace as any).note = "Ни один менеджер не подошел по навыкам. Используется полный пул офиса.";
        } else {
            reasons.push(`Навыки: ${eligible.length} подходят`);
        }
        trace.push(skillTrace);

        // 3. POSITION FILTERING
        const requiredRank = positionRank(requiredPosition);
        let posEligible = eligible.filter(m => positionRank(m.position) >= requiredRank);

        const posTrace = {
            stage: 'POSITION_FILTER',
            input: { requiredPosition, requiredRank },
            analysis: `Фильтрация по грейду (минимум ${requiredPosition}). Текущий пул: ${eligible.length} чел.`,
            candidates_before: eligible.map(mapManager),
            candidates_after: posEligible.map(mapManager),
            was_fallback: posEligible.length === 0
        };

        if (!posEligible.length) {
            posEligible = eligible;
            reasons.push(`Должность: fallback на доступных`);
            (posTrace as any).note = "Нет менеджеров требуемой должности. Fallback на всех доступных.";
        } else {
            reasons.push(`Должность: ${posEligible.length} чел.`);
        }
        trace.push(posTrace);

        // 4. ROUND ROBIN
        const top2 = posEligible.slice(0, 2);
        const rrKey = `${targetOfficeId}_${requiredPosition}`;
        const idx = rrCounters.get(rrKey) ?? 0;
        const selected = top2[idx % top2.length];
        rrCounters.set(rrKey, idx + 1);

        trace.push({
            stage: 'ROUND_ROBIN',
            analysis: `Финальный выбор методом Round Robin среди топ-2 кандидатов с минимальной нагрузкой.`,
            pool: posEligible.map(mapManager),
            top_candidates: top2.map(mapManager),
            selected_index: idx % top2.length,
            decision: { selected: selected.fullName, managerId: selected.id }
        });

        reasons.push(`Round Robin → ${selected.fullName}`);

        return {
            managerId: selected.id,
            officeId: targetOfficeId,
            reason: reasons.join(' | '),
            trace
        };
    }
}

const rrCounters = new Map<string, number>();
