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
          mode: TravelMode.bicycling,
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      });

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

      return [
        {
          id: 'real-route',
          name: `Route from ${origin} to ${destination}`,
          distance: leg.distance.value / 1000, // km
          duration: Math.round(leg.duration.value / 60), // min
          rating: 4.7,
          condition: 'good',
          path: coordinates, // ✅ 前端 MapView 直接可用
          segments: [
            {
              condition: 'good',
              distance: leg.distance.value / 1000,
            },
          ],
        },
      ];
    } catch (error: any) {
      console.error('Google Directions API failed');
      console.error(error?.response?.data || error.message);
      throw new Error('API failed');
    }
  }
}
