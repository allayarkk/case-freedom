import { GeoService } from './geo.service.js';
import prisma from '../config/database.js';
import type { AIAnalysisResult } from './ai.service.js';

interface RoutingResult {
    managerId: string;
    officeId: string;
    reason: string;
}

interface Coords {
    lat: number;
    lng: number;
}

export class RoutingService {
    constructor(private geoService: GeoService) { }

    async findBestManager(ticketId: string, segment: string, analysis: AIAnalysisResult): Promise<RoutingResult> {
        const offices = await prisma.office.findMany();

        let targetOfficeId: string;
        let reason: string;

        const ticketRecord = await prisma.ticket.findUnique({ where: { id: ticketId } });
        const ticketAnalysis = await prisma.ticketAnalysis.findUnique({ where: { ticketId } });

        const lat = ticketAnalysis?.latitude;
        const lng = ticketAnalysis?.longitude;

        if (lat && lng) {
            const nearestOffice = this.findNearestOffice({ lat, lng }, offices);
            targetOfficeId = nearestOffice.id;
            reason = `Nearest office by geo: ${nearestOffice.name}`;
        } else {
            // Fallback: 50/50 between Astana and Almaty
            const fallbacks = offices.filter(o => o.name === 'Астана' || o.name === 'Алматы');
            const chosen = fallbacks.length > 0
                ? fallbacks[Math.floor(Math.random() * fallbacks.length)]
                : offices[0];
            targetOfficeId = chosen.id;
            reason = `Geo fallback → ${chosen.name} (50/50 rule)`;
        }

        // Get managers in target office sorted by least load
        const managers = await prisma.manager.findMany({
            where: { officeId: targetOfficeId },
            orderBy: { activeTicketCount: 'asc' },
        });

        // Apply skill filters
        const eligible = managers.filter(m => {
            // VIP/PRIORITY segment → need VIP skill
            if ((segment === 'VIP' || segment === 'PRIORITY') && !m.skills.includes('VIP')) {
                return false;
            }
            // DATA_CHANGE → must be LEAD_SPECIALIST
            if (analysis.type === 'DATA_CHANGE' && m.position !== 'LEAD_SPECIALIST') {
                return false;
            }
            // Language filter
            if (analysis.language === 'KZ' && !m.skills.includes('KZ')) return false;
            if (analysis.language === 'ENG' && !m.skills.includes('ENG')) return false;

            return true;
        });

        if (eligible.length === 0) {
            // Soft fallback: take least-loaded in office regardless of skills
            const fallback = managers[0];
            if (!fallback) throw new Error(`No managers in office ${targetOfficeId}`);
            return {
                managerId: fallback.id,
                officeId: targetOfficeId,
                reason: `${reason} | skill fallback (no match) → ${fallback.fullName}`,
            };
        }

        // Round Robin: pick from top-2 least loaded
        const top2 = eligible.slice(0, 2);
        const selected = top2[0]; // Least loaded — true RR state would require a counter in DB
        reason += ` | skills match → ${selected.fullName}`;

        return { managerId: selected.id, officeId: targetOfficeId, reason };
    }

    private findNearestOffice(
        clientCoord: Coords,
        offices: Array<{ id: string; name: string; latitude: number | null; longitude: number | null }>
    ): { id: string; name: string } {
        let minDist = Infinity;
        let nearest = offices[0];

        for (const office of offices) {
            if (office.latitude !== null && office.longitude !== null) {
                const dist = this.geoService.calculateDistance(clientCoord, {
                    lat: office.latitude,
                    lng: office.longitude,
                });
                if (dist < minDist) {
                    minDist = dist;
                    nearest = office;
                }
            }
        }

        return nearest;
    }
}
