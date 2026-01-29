import { Controller, Get, Post, Body } from '@nestjs/common';
import axios from 'axios';
import polyline from '@mapbox/polyline';

@Controller('map')

export class MapController {
  @Get('analyze')
  analyze() {
    return {
      issues: [
        { location: [45.462, 9.182], type: 'bad_road' },
      ],
      highlightedPath: [
        [45.46, 9.18],
        [45.461, 9.181],
        [45.462, 9.182],
      ],
    };
  }
@Post('analyze')
async analyzePost(@Body() body: any) {
  const { origin, destination, travelMode } = body;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = 'https://maps.googleapis.com/maps/api/directions/json';

  const response = await axios.get(url, {
    params: {
      origin: typeof origin === 'string'
        ? origin
        : `${origin.lat},${origin.lng}`,
      destination: typeof destination === 'string'
        ? destination
        : `${destination.lat},${destination.lng}`,
      mode: (travelMode || 'BICYCLING').toLowerCase(),
      alternatives: true, // ⭐ 关键：多路线
      key: apiKey,
    },
  });

  const routesFromGoogle = response.data.routes || [];

  // ⭐ 固定只取前三条
  const picked = routesFromGoogle.slice(0, 3);

  const routes = picked.map((r: any, idx: number) => {
    const leg = r.legs?.[0];
 const steps = r.legs?.[0]?.steps ?? [];

const path = steps.flatMap((step: any) =>
  polyline.decode(step.polyline.points).map(
    ([lat, lng]) => [lat, lng]
  )
);

    return {
      id: String(idx + 1),
      summary: idx === 0 ? 'Recommended' : `Alternative ${idx}`,
      distance: leg?.distance?.value
        ? leg.distance.value / 1000
        : 0,
      duration: leg?.duration?.value
        ? Math.round(leg.duration.value / 60)
        : 0,
      path,
    };
  });

  return { routes };
}

}


