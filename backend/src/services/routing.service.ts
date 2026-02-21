// Global in-memory Round Robin counter per office.
// In production this should be moved to Redis or a DB column.
const rrCounters = new Map<string, number>();

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

    async findBestManager(
        ticketId: string,
        segment: string,
        analysis: AIAnalysisResult
    ): Promise<RoutingResult> {
        const offices = await prisma.office.findMany();

        let targetOfficeId: string;
        let reason: string;

        // Read geo coords from the already-saved TicketAnalysis record
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
            const chosen =
                fallbacks.length > 0
                    ? fallbacks[Math.floor(Math.random() * fallbacks.length)]
                    : offices[0];
            targetOfficeId = chosen.id;
            reason = `Geo fallback → ${chosen.name} (50/50 rule)`;
        }

        // Get managers in target office sorted by least load first
        const managers = await prisma.manager.findMany({
            where: { officeId: targetOfficeId },
            orderBy: { activeTicketCount: 'asc' },
        });

        // Filter by competency rules
        const eligible = managers.filter(m => {
            // VIP / PRIORITY segment → manager must have VIP skill
            if ((segment === 'VIP' || segment === 'PRIORITY') && !m.skills.includes('VIP')) {
                return false;
            }
            // DATA_CHANGE type → only LEAD_SPECIALIST
            if (analysis.type === 'DATA_CHANGE' && m.position !== 'LEAD_SPECIALIST') {
                return false;
            }
            // Language skills
            if (analysis.language === 'KZ' && !m.skills.includes('KZ')) return false;
            if (analysis.language === 'ENG' && !m.skills.includes('ENG')) return false;

            return true;
        });

        if (eligible.length === 0) {
            // Soft fallback: least-loaded in office regardless of skills
            const fallback = managers[0];
            if (!fallback) throw new Error(`No managers found in office ${targetOfficeId}`);
            return {
                managerId: fallback.id,
                officeId: targetOfficeId,
                reason: `${reason} | skill fallback (no exact match) → ${fallback.fullName}`,
            };
        }

        // Round Robin among top-2 least-loaded eligible managers
        // State is keyed by officeId so RR is per-office
        const top2 = eligible.slice(0, 2);
        const currentIndex = rrCounters.get(targetOfficeId) ?? 0;
        const selected = top2[currentIndex % top2.length];
        rrCounters.set(targetOfficeId, currentIndex + 1);

        reason += ` | Round Robin (${currentIndex % top2.length === 0 ? 'A' : 'B'}) → ${selected.fullName}`;

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
