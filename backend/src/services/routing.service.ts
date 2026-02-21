/** In-memory Round Robin счетчик (по officeId) */
const rrCounters = new Map<string, number>();

import { GeoService } from './geo.service.js';
import prisma from '../config/database.js';
import type { AIAnalysisResult } from './ai.service.js';

interface RoutingResult { managerId: string; officeId: string; reason: string; }

export class RoutingService {
    constructor(private geo: GeoService) { }

    /**
     * Каскад фильтров ТЗ:
     * 1. Гео → ближайший офис (fallback: 50/50 Астана/Алматы)
     * 2. Навыки → VIP/PRIORITY, DATA_CHANGE, язык KZ/ENG
     * 3. Round Robin → 2 наименее загруженных менеджера, чередование
     */
    async findBestManager(ticketId: string, segment: string, analysis: AIAnalysisResult): Promise<RoutingResult> {
        const offices = await prisma.office.findMany();
        if (!offices.length) throw new Error('No offices found. Import offices first.');

        // 1. Географический фильтр
        const ticketGeo = await prisma.ticketAnalysis.findUnique({ where: { ticketId } });
        let targetOfficeId: string;
        let reason: string;

        if (ticketGeo?.latitude && ticketGeo?.longitude) {
            const nearest = this.findNearestOffice({ lat: ticketGeo.latitude, lng: ticketGeo.longitude }, offices);
            targetOfficeId = nearest.id;
            reason = `Гео: ближайший офис ${nearest.name}`;
        } else {
            const fallbacks = offices.filter(o => o.name === 'Астана' || o.name === 'Алматы');
            const chosen = fallbacks.length ? fallbacks[Math.floor(Math.random() * fallbacks.length)] : offices[0];
            targetOfficeId = chosen.id;
            reason = `Гео: fallback → ${chosen.name} (правило 50/50)`;
        }

        // 2. Фильтр компетенций
        const managers = await prisma.manager.findMany({
            where: { officeId: targetOfficeId },
            orderBy: { activeTicketCount: 'asc' },
        });

        if (!managers.length) {
            const any = await prisma.manager.findFirst();
            if (!any) throw new Error('No managers found. Import managers first.');
            return { managerId: any.id, officeId: any.officeId, reason: `${reason} | нет менеджеров в офисе → ${any.fullName}` };
        }

        const eligible = managers.filter(m => {
            if ((segment === 'VIP' || segment === 'PRIORITY') && !m.skills.includes('VIP')) return false;
            if (analysis.type === 'DATA_CHANGE' && m.position !== 'LEAD_SPECIALIST') return false;
            if (analysis.language === 'KZ' && !m.skills.includes('KZ')) return false;
            if (analysis.language === 'ENG' && !m.skills.includes('ENG')) return false;
            return true;
        });

        if (!eligible.length) {
            return { managerId: managers[0].id, officeId: targetOfficeId, reason: `${reason} | skill fallback → ${managers[0].fullName}` };
        }

        // 3. Round Robin среди топ-2 подходящих
        const top2 = eligible.slice(0, 2);
        const idx = rrCounters.get(targetOfficeId) ?? 0;
        const selected = top2[idx % top2.length];
        rrCounters.set(targetOfficeId, idx + 1);

        reason += ` | Round Robin (${idx % top2.length === 0 ? 'A' : 'B'}) → ${selected.fullName}`;
        return { managerId: selected.id, officeId: targetOfficeId, reason };
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
