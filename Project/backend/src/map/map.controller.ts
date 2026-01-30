import { Controller, Get, Post, Body } from '@nestjs/common';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import { PrismaClient } from '@prisma/client';

type RoadCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEED_REPAIR';
type FrontendCondition = 'excellent' | 'good' | 'fair' | 'needRepair';

const prisma = new PrismaClient();

// ====== 采样与匹配参数 ======
const SAMPLE_EVERY_N_POINTS = 10;
const MAX_SAMPLES = 120;
const STREET_MATCH_RADIUS_M = 60;

// ====== 路况模型参数 ======
const ROAD_FACTOR_K = 1.5;

const CONDITION_DELTA: Record<RoadCondition, number> = {
  EXCELLENT: +0.2,
  GOOD: +0.1,
  FAIR: 0.0,
  NEED_REPAIR: -0.25,
};

const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
};

@Controller('map')
export class MapController {
  // =========================
  // 路线分析
  // =========================
  @Post('analyze')
  async analyze(@Body() body: any) {
    const { origin, destination, travelMode } = body;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return { routes: [] };

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      {
        params: {
          origin:
            typeof origin === 'string'
              ? origin
              : `${origin.lat},${origin.lng}`,
          destination:
            typeof destination === 'string'
              ? destination
              : `${destination.lat},${destination.lng}`,
          mode: (travelMode || 'BICYCLING').toLowerCase(),
          alternatives: true,
          key: apiKey,
        },
      },
    );

    const routesFromGoogle = response.data.routes ?? [];
    const picked = routesFromGoogle.slice(0, 3);

    const rawRoutes = picked.map((r: any, idx: number) => {
      const leg = r.legs?.[0];
      const steps = leg?.steps ?? [];

      const path: [number, number][] = steps.flatMap((step: any) =>
        polyline
          .decode(step.polyline.points)
          .map(([lat, lng]) => [lat, lng]),
      );

      return {
        id: String(idx + 1),
        name: `Route ${idx + 1}`,
        distance: leg?.distance?.value
          ? leg.distance.value / 1000
          : 0,
        duration: leg?.duration?.value
          ? Math.round(leg.duration.value / 60)
          : 0,
        path,
      };
    });

    if (!rawRoutes.length) return { routes: [] };

    const minDistanceKm = Math.min(
      ...rawRoutes.map((r) => Math.max(r.distance, 0.001)),
    );
    const minDurationMin = Math.min(
      ...rawRoutes.map((r) => Math.max(r.duration, 0.001)),
    );

    const enriched = await Promise.all(
      rawRoutes.map(async (r) => {
        const distanceNorm = minDistanceKm / Math.max(r.distance, 0.001);
        const durationNorm = minDurationMin / Math.max(r.duration, 0.001);
        const efficiencyScore = 0.5 * distanceNorm + 0.5 * durationNorm;

        const road = await this.getRouteRoadDelta(r.path);

        let roadFactor = 1 + ROAD_FACTOR_K * road.deltaRoad;
        roadFactor = Math.max(0.4, Math.min(1.6, roadFactor));

        const score = 100 * efficiencyScore * roadFactor;
        const scoreRounded = Number(
          Math.max(0, Math.min(100, score)).toFixed(1),
        );

        return {
          id: r.id,
          name: r.name,
          distance: Number(r.distance.toFixed(3)),
          duration: r.duration,
          condition: this.scoreToCondition(scoreRounded),
          path: r.path,
          score: scoreRounded,
          streetIds: road.streetIds,
        };
      }),
    );

    enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return { routes: enriched };
  }

  // =========================
  // ✅ 只返回“用户评论内容（notes）”
  // =========================
  @Post('street-reports')
  async getStreetReports(@Body() body: { streetIds: string[] }) {
    const { streetIds } = body;

    if (!streetIds || streetIds.length === 0) {
      return { reports: [] };
    }

    const reports = await prisma.streetReport.findMany({
      where: {
        streetId: {
          in: streetIds,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      reports: reports
        .filter((r) => r.notes && r.notes.trim() !== '')
        .map((r) => ({
          content: r.notes,
          roadCondition: r.roadCondition, 
          date: r.createdAt.toISOString(),
        })),
    };
  }

  // =========================
  // 内部工具函数
  // =========================
  private async getRouteRoadDelta(path: [number, number][]) {
    const coverage = await this.resolveStreetCoverageForRoute(path);
    const streetIds = coverage.map((c) => c.streetId);

    return {
      deltaRoad: 0,
      ratedWeightSum: 0,
      winnerCondition: 'GOOD' as RoadCondition,
      winnerConfidence: 0,
      weightMapping: {},
      ratedCoverage: 0,
      ratedHits: 0,
      totalHits: 0,
      streetIds,
    };
  }

  private async resolveStreetCoverageForRoute(path: [number, number][]) {
    const sampled = this.samplePath(path, SAMPLE_EVERY_N_POINTS, MAX_SAMPLES);
    if (!sampled.length) return [];

    const valuesSql = sampled
      .map((p, i) => `(${i}, ${p[1]}, ${p[0]})`)
      .join(',');

    const rows = await prisma.$queryRawUnsafe<
      { idx: number; streetId: string }[]
    >(`
      WITH pts(idx, lng, lat) AS (VALUES ${valuesSql})
      SELECT pts.idx, s.id AS "streetId"
      FROM pts
      JOIN LATERAL (
        SELECT id FROM "Street"
        WHERE geometry IS NOT NULL
        AND ST_DWithin(
          geometry,
          ST_SetSRID(ST_MakePoint(pts.lng, pts.lat), 4326)::geography,
          ${STREET_MATCH_RADIUS_M}
        )
        ORDER BY ST_Distance(
          geometry,
          ST_SetSRID(ST_MakePoint(pts.lng, pts.lat), 4326)::geography
        )
        LIMIT 1
      ) s ON TRUE;
    `);

    const counter = new Map<string, number>();
    for (const r of rows) {
      counter.set(r.streetId, (counter.get(r.streetId) ?? 0) + 1);
    }

    return Array.from(counter.entries()).map(([streetId, hits]) => ({
      streetId,
      hits,
    }));
  }

  private samplePath(
    path: [number, number][],
    step: number,
    maxSamples: number,
  ) {
    const out: [number, number][] = [];
    for (let i = 0; i < path.length; i += step) {
      out.push(path[i]);
      if (out.length >= maxSamples) break;
    }
    if (out[out.length - 1] !== path[path.length - 1]) {
      out.push(path[path.length - 1]);
    }
    return out;
  }

  private scoreToCondition(score: number): FrontendCondition {
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'excellent';
    if (score >= SCORE_THRESHOLDS.GOOD) return 'good';
    if (score >= SCORE_THRESHOLDS.FAIR) return 'fair';
    return 'needRepair';
  }
}
