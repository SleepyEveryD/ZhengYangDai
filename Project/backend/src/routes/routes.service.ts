import { Injectable } from '@nestjs/common';
import { Client, TravelMode } from '@googlemaps/google-maps-services-js';
import { decode } from '@googlemaps/polyline-codec';

@Injectable()
export class RoutesService {
  private client = new Client({});

  async getRoutes(origin?: string, destination?: string) {
    

    if (!origin || !destination) {
      return [];
    }

    try {
      console.log(
        'Using API key:',
        process.env.GOOGLE_MAPS_API_KEY?.slice(0, 6),
      );

      const response = await this.client.directions({
        params: {
          origin,
          destination,
          alternatives: true,
          mode: TravelMode.bicycling,
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      });
      console.log('routes count:', response.data.routes.length);
      const route = response.data.routes[0];
      const leg = route.legs[0];

      /* ===============================
         ✅ 关键：解码每一个 step
      =============================== */
      const coordinates: [number, number][] = [];

      leg.steps.forEach((step) => {
        const decoded = decode(step.polyline.points);
        decoded.forEach(([lat, lng]) => {
          coordinates.push([lat, lng]);
        });
      });

     return response.data.routes.map((route, index) => {
  const leg = route.legs[0];

  const coordinates: [number, number][] = [];

  leg.steps.forEach((step) => {
    const decoded = decode(step.polyline.points);
    decoded.forEach(([lat, lng]) => {
      coordinates.push([lat, lng]);
    });
  });

  return {
    id: `real-route-${index + 1}`,
    name: `Route ${index + 1}`,
    distance: leg.distance.value / 1000,
    duration: Math.round(leg.duration.value / 60),
    rating: 4.5 - index * 0.2, // 临时假数据
    condition: index === 0 ? 'good' : index === 1 ? 'fair' : 'excellent',
    path: coordinates,
    segments: [
      {
        condition: index === 0 ? 'good' : index === 1 ? 'fair' : 'excellent',
        distance: leg.distance.value / 1000,
      },
    ],
  };
});

    } catch (error: any) {
      console.error('Google Directions API failed');
      console.error(error?.response?.data || error.message);
      throw new Error('API failed');
    }
  }
}
