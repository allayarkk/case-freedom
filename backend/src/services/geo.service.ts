import axios from 'axios';

interface Coords { lat: number; lng: number; }

export class GeoService {
    /** Nominatim geocoding → координаты по текстовому адресу */
    async getCoordinates(address: string): Promise<Coords | null> {
        try {
            const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: { q: address, format: 'json', limit: 1 },
                headers: { 'User-Agent': 'FIRE-Routing-Engine/1.0' },
                timeout: 8000,
            });

            if (data?.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
            return null;
        } catch (err: unknown) {
            console.error('[Geo] Error:', err instanceof Error ? err.message : err);
            return null;
        }
    }

    /** Haversine — расстояние между двумя точками в км */
    calculateDistance(a: Coords, b: Coords): number {
        const R = 6371;
        const dLat = this.rad(b.lat - a.lat);
        const dLon = this.rad(b.lng - a.lng);
        const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(this.rad(a.lat)) * Math.cos(this.rad(b.lat));
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    private rad(v: number) { return (v * Math.PI) / 180; }
}
