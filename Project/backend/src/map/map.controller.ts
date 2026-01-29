import { Controller, Get, Post, Body } from '@nestjs/common';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import { PrismaClient } from '@prisma/client';

type RoadCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEED_REPAIR';
type FrontendCondition = 'excellent' | 'good' | 'fair' | 'needRepair';

const prisma = new PrismaClient();

// ====== 采样与匹配参数（按性能/精度调）======
const SAMPLE_EVERY_N_POINTS = 10;
const MAX_SAMPLES = 120;
const STREET_MATCH_RADIUS_M = 60;

// ====== 路况加减分：乘法模型强度（越大越“看重路况”）======
// 推荐 1.0 ~ 2.0
const ROAD_FACTOR_K = 1.5;

// ====== 好评加分、坏评减分（FAIR 中性）======
const CONDITION_DELTA: Record<RoadCondition, number> = {
  EXCELLENT: +0.2,
  GOOD: +0.1,
  FAIR: 0.0,
  NEED_REPAIR: -0.25,
};

// ====== ✅ 最终：score -> condition（只由 finalScore 决定）======
// 你要调档位就改这几个阈值
const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
};

@Controller('map')
export class MapController {
  @Get('analyze')
  analyze() {
    return { routes: [] };
  }

  @Post('analyze')
  async analyzePost(@Body() body: any) {
    const { origin, destination, travelMode } = body;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return { routes: [], error: 'Missing GOOGLE_MAPS_API_KEY' };
    }

    const url = 'https://maps.googleapis.com/maps/api/directions/json';

    const response = await axios.get(url, {
      params: {
        origin:
          typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`,
        destination:
          typeof destination === 'string'
            ? destination
            : `${destination.lat},${destination.lng}`,
        mode: (travelMode || 'BICYCLING').toLowerCase(),
        alternatives: true,
        key: apiKey,
      },
    });

    const routesFromGoogle = response.data.routes || [];
    const picked = routesFromGoogle.slice(0, 3);

    const rawRoutes = picked.map((r: any, idx: number) => {
      const leg = r.legs?.[0];
      const steps = leg?.steps ?? [];

      const path: [number, number][] = steps.flatMap((step: any) =>
        polyline.decode(step.polyline.points).map(([lat, lng]) => [lat, lng]),
      );

      return {
        id: String(idx + 1),
        name: `Route ${idx + 1}`,
        distance: leg?.distance?.value ? leg.distance.value / 1000 : 0, // km
        duration: leg?.duration?.value
          ? Math.round(leg.duration.value / 60)
          : 0, // min
        path,
      };
    });

    if (!rawRoutes.length) return { routes: [] };

    // ✅ 同一次 query 内效率归一化
    const minDistanceKm = Math.min(
      ...rawRoutes.map((r) => Math.max(r.distance, 0.001)),
    );
    const minDurationMin = Math.min(
      ...rawRoutes.map((r) => Math.max(r.duration, 0.001)),
    );

    const enriched = await Promise.all(
      rawRoutes.map(async (r) => {
        // 1) 效率分（0~1）
        const distanceNorm = minDistanceKm / Math.max(r.distance, 0.001);
        const durationNorm = minDurationMin / Math.max(r.duration, 0.001);
        const efficiencyScore = 0.5 * distanceNorm + 0.5 * durationNorm;

        // 2) 路况 delta（只看已评价 streets；未评价不参与）
        const road = await this.getRouteRoadDelta(r.path);

        // 3) 乘法修正：roadFactor = 1 + K*deltaRoad
        let roadFactor = 1 + ROAD_FACTOR_K * road.deltaRoad;
        roadFactor = Math.max(0.4, Math.min(1.6, roadFactor)); // clamp 防极端

        // 4) 最终分
        const score = 100 * efficiencyScore * roadFactor;
        const scoreClamped = Math.max(0, Math.min(100, score));
        const scoreRounded = Number(scoreClamped.toFixed(1));

        // ✅ 5) condition 现在只由 finalScore 决定
        const conditionByScore = this.scoreToCondition(scoreRounded);

        // 6) explain（你前端能直接 console 看清楚怎么来的）
        const explain = {
          mode: 'real' as const,
          roadCondition: {
            // 注意：final 现在是“由分数决定的等级”，不是 street 投票 winner
            final: conditionByScore,
            // confidence 仍然是 street 投票 winner 的占比（用于解释“数据一致性”）
            confidence: Number(road.ratedWeightSum > 0 ? road.winnerConfidence.toFixed(4) : 0),
            usedScore: Number(this.conditionToUsedScore(road.winnerCondition).toFixed(4)),
            weightMapping: road.weightMapping,

            ratedCoverage: Number(road.ratedCoverage.toFixed(4)),
            ratedHits: road.ratedHits,
            totalHits: road.totalHits,
            deltaRoad: Number(road.deltaRoad.toFixed(4)),
            K: ROAD_FACTOR_K,
            roadFactor: Number(roadFactor.toFixed(4)),
          },
          efficiency: {
            distanceKm: Number(r.distance.toFixed(3)),
            durationMin: r.duration,
            minDistanceKm: Number(minDistanceKm.toFixed(3)),
            minDurationMin: minDurationMin,
            distanceNorm: Number(distanceNorm.toFixed(4)),
            durationNorm: Number(durationNorm.toFixed(4)),
            efficiencyScore: Number(efficiencyScore.toFixed(4)),
          },
          finalScoreFormula:
            'score = 100*efficiencyScore*(clamp(1 + K*deltaRoad)); condition determined by score thresholds',
        };

        return {
          id: r.id,
          name: r.name,
          distance: Number(r.distance.toFixed(3)),
          duration: r.duration,
          // ✅ 前端 badge 用这个（由 score 决定）
          condition: conditionByScore,
          path: r.path,
          score: scoreRounded,
          confidence: Number((road.ratedWeightSum > 0 ? road.winnerConfidence : 0).toFixed(2)),
          explain,
        };
      }),
    );

    // ✅ 按 score 排序
    enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return { routes: enriched };
  }

  /**
   * ✅ 只用“已评价 streets（StreetAggregation 存在）”计算 deltaRoad
   * deltaRoad = Σ(weight * delta(condition)) / Σ(weight)
   * weight = hits * clamp(agreementScore)
   *
   * 未评价 streets：跳过（不参与）
   */
  private async getRouteRoadDelta(path: [number, number][]): Promise<{
    deltaRoad: number;
    ratedWeightSum: number;
    winnerCondition: RoadCondition;
    winnerConfidence: number;
    weightMapping: Record<string, number>;
    ratedCoverage: number;
    ratedHits: number;
    totalHits: number;
  }> {
    const coverage = await this.resolveStreetCoverageForRoute(path);

    if (coverage.length === 0) {
      return {
        deltaRoad: 0,
        ratedWeightSum: 0,
        winnerCondition: 'GOOD',
        winnerConfidence: 0,
        weightMapping: { EXCELLENT: 0, GOOD: 0, FAIR: 0, NEED_REPAIR: 0 },
        ratedCoverage: 0,
        ratedHits: 0,
        totalHits: 0,
      };
    }

    const streetIds = coverage.map((c) => c.streetId);

    const aggs = await prisma.streetAggregation.findMany({
      where: { streetId: { in: streetIds } },
      select: { streetId: true, finalCondition: true, agreementScore: true },
    });

    const aggMap = new Map(
      aggs.map((a) => [
        a.streetId,
        {
          cond: a.finalCondition as RoadCondition,
          agree: typeof a.agreementScore === 'number' ? a.agreementScore : 0.2,
        },
      ]),
    );

    const w: Record<RoadCondition, number> = {
      EXCELLENT: 0,
      GOOD: 0,
      FAIR: 0,
      NEED_REPAIR: 0,
    };

    let num = 0;
    let den = 0;

    let ratedHits = 0;
    let totalHits = 0;

    for (const c of coverage) {
      totalHits += c.hits;

      const a = aggMap.get(c.streetId);
      if (!a) continue; // ✅ 未评价：不考虑

      ratedHits += c.hits;

      const agree = Math.max(0.05, Math.min(1, a.agree));
      const weight = c.hits * agree;

      num += weight * CONDITION_DELTA[a.cond];
      den += weight;

      w[a.cond] += weight;
    }

    const deltaRoad = den > 0 ? num / den : 0;

    const { top, conf } = this.pickTopCondition(w);
    const ratedCoverage = totalHits > 0 ? ratedHits / totalHits : 0;

    return {
      deltaRoad,
      ratedWeightSum: den,
      winnerCondition: top ?? 'GOOD',
      winnerConfidence: conf,
      weightMapping: {
        EXCELLENT: Number(w.EXCELLENT.toFixed(6)),
        GOOD: Number(w.GOOD.toFixed(6)),
        FAIR: Number(w.FAIR.toFixed(6)),
        NEED_REPAIR: Number(w.NEED_REPAIR.toFixed(6)),
      },
      ratedCoverage,
      ratedHits,
      totalHits,
    };
  }

  /**
   * ✅ route.path -> street coverage（streetId + hits）
   * 每个采样点：半径内最近 street（PostGIS）
   */
  private async resolveStreetCoverageForRoute(path: [number, number][]) {
    const sampled = this.samplePath(path, SAMPLE_EVERY_N_POINTS, MAX_SAMPLES);
    if (sampled.length === 0) return [];

    // VALUES: (idx, lng, lat)
    const valuesSql = sampled.map((p, i) => `(${i}, ${p[1]}, ${p[0]})`).join(',');

    const rows = await prisma.$queryRawUnsafe<{ idx: number; streetId: string }[]>(
      `
      WITH pts(idx, lng, lat) AS (
        VALUES ${valuesSql}
      )
      SELECT
        pts.idx,
        s.id AS "streetId"
      FROM pts
      JOIN LATERAL (
        SELECT id
        FROM "Street"
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
      `,
    );

    const counter = new Map<string, number>();
    for (const r of rows) {
      counter.set(r.streetId, (counter.get(r.streetId) ?? 0) + 1);
    }

    return Array.from(counter.entries())
      .map(([streetId, hits]) => ({ streetId, hits }))
      .sort((a, b) => b.hits - a.hits);
  }

  private samplePath(path: [number, number][], step: number, maxSamples: number) {
    if (!path?.length) return [];
    const out: [number, number][] = [];

    for (let i = 0; i < path.length; i += step) {
      out.push(path[i]);
      if (out.length >= maxSamples) break;
    }

    // 最后一点也参与匹配，提高稳定性
    const last = path[path.length - 1];
    if (out.length > 0) {
      const tail = out[out.length - 1];
      if (tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
    }
    return out;
  }

  private pickTopCondition(w: Record<RoadCondition, number>): {
    top: RoadCondition | null;
    conf: number;
  } {
    const entries = Object.entries(w) as Array<[RoadCondition, number]>;
    entries.sort((a, b) => b[1] - a[1]);

    const sum = entries.reduce((acc, [, v]) => acc + v, 0);
    if (sum <= 0) return { top: null, conf: 0 };

    const top = entries[0][0];
    const conf = entries[0][1] / sum;
    return { top, conf };
  }

  /**
   * ✅ 由 finalScore 决定 UI condition
   */
  private scoreToCondition(score: number): FrontendCondition {
    if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'excellent';
    if (score >= SCORE_THRESHOLDS.GOOD) return 'good';
    if (score >= SCORE_THRESHOLDS.FAIR) return 'fair';
    return 'needRepair';
  }

  /**
   * ✅ explain 用（不是用来决定 UI condition 的）
   */
  private conditionToUsedScore(cond: RoadCondition): number {
    switch (cond) {
      case 'EXCELLENT':
        return 1.0;
      case 'GOOD':
        return 0.8;
      case 'FAIR':
        return 0.55;
      case 'NEED_REPAIR':
        return 0.2;
    }
  }
}