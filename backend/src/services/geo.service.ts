import axios from 'axios';

interface Coords { lat: number; lng: number; }

export class GeoService {
    async getCoordinatesWithTrace(addressObj: { country: string; oblast?: string; city: string; street?: string; houseNumber?: string }) {
        const trace: any[] = [];

        const attempts = [
            // 1. Полный адрес
            [addressObj.country, addressObj.oblast, addressObj.city, addressObj.street, addressObj.houseNumber].filter(Boolean).join(', '),
            // 2. Только город + область
            [addressObj.country, addressObj.oblast, addressObj.city].filter(Boolean).join(', '),
            // 3. Только город
            [addressObj.country, addressObj.city].filter(Boolean).join(', '),
            // 4. Только область
            [addressObj.country, addressObj.oblast].filter(Boolean).join(', ')
        ].filter((v, i, a) => a.indexOf(v) === i); // убрать дубли

        for (const [idx, q] of attempts.entries()) {
            const start = performance.now();
            try {
                const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: { q, format: 'json', limit: 1 },
                    headers: { 'User-Agent': 'FIRE-Routing-Engine/1.0' },
                    timeout: 5000,
                });

                const duration = Math.round(performance.now() - start);

                if (data?.length > 0) {
                    const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                    trace.push({ step: idx + 1, query: q, status: 'SUCCESS', result: coords, duration });
                    return { coords, trace };
                }

                trace.push({ step: idx + 1, query: q, status: 'NOT_FOUND', duration });
            } catch (err) {
                const duration = Math.round(performance.now() - start);
                trace.push({ step: idx + 1, query: q, status: 'ERROR', error: String(err), duration });
            }
        }

        return { coords: null, trace };
    }

    async getCoordinates(address: string): Promise<Coords | null> {
        return (await this.getCoordinatesWithTrace({ country: address, city: '' })).coords;
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
