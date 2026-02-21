// Global in-memory Round Robin counter per office.
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

        if (offices.length === 0) {
            throw new Error('No offices found in database. Please import offices first.');
        }

        let targetOfficeId: string;
        let reason: string;

        const ticketAnalysis = await prisma.ticketAnalysis.findUnique({ where: { ticketId } });
        const lat = ticketAnalysis?.latitude;
        const lng = ticketAnalysis?.longitude;

        if (lat && lng) {
            const nearestOffice = this.findNearestOffice({ lat, lng }, offices);
            targetOfficeId = nearestOffice.id;
            reason = `Nearest office by geo: ${nearestOffice.name}`;
        } else {
            const fallbacks = offices.filter(o => o.name === 'Астана' || o.name === 'Алматы');
            const chosen =
                fallbacks.length > 0
                    ? fallbacks[Math.floor(Math.random() * fallbacks.length)]
                    : offices[0];
            targetOfficeId = chosen.id;
            reason = `Geo fallback → ${chosen.name} (50/50 rule)`;
        }

        const managers = await prisma.manager.findMany({
            where: { officeId: targetOfficeId },
            orderBy: { activeTicketCount: 'asc' },
        });

        if (managers.length === 0) {
            // Find ANY manager if target office has none
            const anyManager = await prisma.manager.findFirst();
            if (!anyManager) throw new Error('No managers found in database. Please import managers first.');

            return {
                managerId: anyManager.id,
                officeId: anyManager.officeId,
                reason: `${reason} | FAILED to find manager in office, fallback to first available: ${anyManager.fullName}`
            };
        }

        const eligible = managers.filter(m => {
            if ((segment === 'VIP' || segment === 'PRIORITY') && !m.skills.includes('VIP')) {
                return false;
            }
            if (analysis.type === 'DATA_CHANGE' && m.position !== 'LEAD_SPECIALIST') {
                return false;
            }
            if (analysis.language === 'KZ' && !m.skills.includes('KZ')) return false;
            if (analysis.language === 'ENG' && !m.skills.includes('ENG')) return false;

            return true;
        });

        if (eligible.length === 0) {
            const fallback = managers[0];
            return {
                managerId: fallback.id,
                officeId: targetOfficeId,
                reason: `${reason} | skill fallback (no exact match) → ${fallback.fullName}`,
            };
        }

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
