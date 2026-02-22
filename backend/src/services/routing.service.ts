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
 */
const POSITION_HIERARCHY: Record<string, number> = {
    Специалист: 1,
    Ведущий_специалист: 2,
    Главный_специалист: 3,
};

function positionRank(pos: string): number {
    return POSITION_HIERARCHY[pos] ?? 1;
}

function getMinPositionForType(type: string, priority: number): string {
    if (type === 'Смена_данных' || priority >= 9) return 'Главный_специалист';
    if (type === 'Претензия' || priority >= 7) return 'Ведущий_специалист';
    return 'Специалист';
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
        if (!offices.length) throw new Error('No offices found.');

        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) throw new Error('Ticket not found');

        // 1. STRATEGY (Preferred Position)
        const requiredPosition = getMinPositionForType(analysis.type, analysis.priority);
        const requiredRank = positionRank(requiredPosition);

        trace.push({
            stage: 'STRATEGY',
            decision: { requiredPosition, requiredRank },
            reason: `Предпочтительный грейд: ${requiredPosition} (Type: ${analysis.type}, Priority: ${analysis.priority})`
        });

        // 2. OFFICE CHAINING
        const ticketAnalysis = await prisma.ticketAnalysis.findUnique({ where: { ticketId } });
        const clientCoords = ticketAnalysis?.latitude ? { lat: ticketAnalysis.latitude, lng: ticketAnalysis.longitude! } : null;

        let sortedOffices = [...offices];
        const clientCity = (analysis.normalizedLocation?.city || ticket.city || '').toLowerCase().trim();

        if (clientCoords) {
            sortedOffices = offices.map(o => ({
                ...o,
                distance: o.latitude ? this.geo.calculateDistance(clientCoords, { lat: o.latitude, lng: o.longitude! }) : Infinity
            })).sort((a, b) => {
                // Прямое сравнение дистанций, если они обе существуют
                if (a.distance !== Infinity && b.distance !== Infinity) {
                    return a.distance - b.distance;
                }

                // Fallback: если координат нет, полагаемся на совпадение по имени города
                const aName = a.name.toLowerCase().trim();
                const bName = b.name.toLowerCase().trim();

                if (aName === clientCity && bName !== clientCity) return -1;
                if (bName === clientCity && aName !== clientCity) return 1;

                const hqList = ['астана', 'алматы'];
                if (hqList.includes(aName) && !hqList.includes(bName)) return -1;
                if (hqList.includes(bName) && !hqList.includes(aName)) return 1;

                return a.distance - b.distance;
            });
        } else {
            sortedOffices = offices.sort((a, b) => {
                const aName = a.name.toLowerCase().trim();
                const bName = b.name.toLowerCase().trim();
                if (aName === clientCity) return -1;
                if (bName === clientCity) return 1;
                const hqList = ['астана', 'алматы'];
                if (hqList.includes(aName)) return -1;
                if (hqList.includes(bName)) return 1;
                return 0;
            });
        }

        // 3. RETRY CHAIN
        for (const office of sortedOffices) {
            const managers = await prisma.manager.findMany({
                where: { officeId: office.id },
            });

            if (!managers.length) {
                trace.push({ stage: 'OFFICE_SCAN', office: office.name, status: 'SKIPPED', reason: 'Нет менеджеров в офисе' });
                continue;
            }

            // FILTER: HARD REQUIREMENTS (Competencies)
            const matchedOnes = managers.filter(m => {
                // 1. Language (Hard)
                if (analysis.language === 'KZ' && !m.skills.includes('KZ')) return false;
                if (analysis.language === 'ENG' && !m.skills.includes('ENG')) return false;

                // 2. VIP/Priority (Hard: Only VIP skill)
                const isVipPriority = (segment === 'VIP' || segment === 'PRIORITY');
                if (isVipPriority && !m.skills.includes('VIP')) return false;

                // 3. Data Change (Hard: Position 'Главный_специалист')
                if (analysis.type === 'Смена_данных' && m.position !== 'Главный_специалист') return false;

                return true;
            });

            if (!matchedOnes.length) {
                trace.push({
                    stage: 'OFFICE_SCAN',
                    office: office.name,
                    status: 'SKIPPED',
                    reason: `Нет менеджеров, соответствующих жестким компетенциям (Type: ${analysis.type}, Segment: ${segment}, Lang: ${analysis.language})`
                });
                continue;
            }

            // SELECTION: Load-Balanced Round Robin (LBRR)
            // 1. Соответствие грейду 2. Минимальная нагрузка 3. Время последнего назначения (updatedAt)
            const sortedPool = matchedOnes.sort((a, b) => {
                const aRank = positionRank(a.position);
                const bRank = positionRank(b.position);

                const aMatches = aRank >= requiredRank;
                const bMatches = bRank >= requiredRank;

                // Сначала грейд (если того требует сложность)
                if (aMatches && !bMatches) return -1;
                if (!aMatches && bMatches) return 1;

                // Затем нагрузка
                if (a.activeTicketCount !== b.activeTicketCount) {
                    return a.activeTicketCount - b.activeTicketCount;
                }

                // Если нагрузка равна — Round Robin (кто дольше всех не получал тикет)
                return a.updatedAt.getTime() - b.updatedAt.getTime();
            });

            const selected = sortedPool[0];
            const matchingGrade = positionRank(selected.position) >= requiredRank;

            trace.push({
                stage: 'FINAL_SELECTION',
                office: office.name,
                manager: selected.fullName,
                decision: `LBRR: Выбран ${selected.fullName} (Нагрузка: ${selected.activeTicketCount}, Последнее назначение: ${selected.updatedAt.toISOString()})`,
                stats: { load: selected.activeTicketCount, position: selected.position }
            });

            return {
                managerId: selected.id,
                officeId: office.id,
                reason: `Маршрут (LBRR): ${office.name} -> ${selected.fullName} (${selected.position})`,
                trace
            };
        }

        // Если цепочка офисов пройдена и никто не найден — выбрасываем ошибку.
        // Мы не можем назначать тикет менеджеру, который не соответствует Hard Skills.
        throw new Error(`Не удалось найти подходящего менеджера (Hard Skills: VIP=${segment === 'VIP' || segment === 'PRIORITY'}, Lang=${analysis.language}, Type=${analysis.type})`);
    }
}
