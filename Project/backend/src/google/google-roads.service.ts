// src/google/google-roads.service.ts
import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleRoadsService {
  async snapToRoads(coordinates: number[][]) {
    if (coordinates.length < 2) return [];

    // GeoJSON: [lng, lat] → Google: lat,lng
    const path = coordinates
      .map(([lng, lat]) => `${lat},${lng}`)
      .join('|');

    const url = 'https://roads.googleapis.com/v1/snapToRoads';

    const res = await axios.get(url, {
      params: {
        path,
        interpolate: true,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000,
    });

    return res.data?.snappedPoints ?? [];
  }
}
