import axios from 'axios';

interface Coordinates {
    lat: number;
    lng: number;
}

export class GeoService {
    private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';

    async getCoordinates(address: string): Promise<Coordinates | null> {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    q: address,
                    format: 'json',
                    limit: 1,
                },
                headers: {
                    'User-Agent': 'FIRE-Routing-Engine/1.0 (freedom-broker)',
                },
                timeout: 8000,
            });

            if (response.data && response.data.length > 0) {
                return {
                    lat: parseFloat(response.data[0].lat as string),
                    lng: parseFloat(response.data[0].lon as string),
                };
            }

            return null;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Geo lookup failed';
            console.error('GeoService error:', message);
            return null;
        }
    }

    calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
        const R = 6371;
        const dLat = this.toRad(coord2.lat - coord1.lat);
        const dLon = this.toRad(coord2.lng - coord1.lng);
        const lat1 = this.toRad(coord1.lat);
        const lat2 = this.toRad(coord2.lat);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private toRad(value: number): number {
        return (value * Math.PI) / 180;
    }
}
