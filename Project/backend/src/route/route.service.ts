/*import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ConditionLevel, ReportStatus } from '@prisma/client';

type LatLng = [number, number]; // [lat, lng]

type RouteCandidate = {
  provider: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: any; // GeoJSON

  // below are computed
  score?: number;
  rank?: number;
  confidence?: 'high' | 'low';
  scoring?: {
    effectiveness: number; // 0..1
    quality: number;       // 0..1
    evidence: number;      // 0..1 
  };
};

@Injectable()
export class RouteService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- 1) 输入解析 ----------
  private parseLatLng(input: string): LatLng {
    const [latStr, lngStr] = input.split(',').map(s => s.trim());
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Invalid lat,lng');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('lat/lng out of range');
    }
    return [lat, lng];
  }

  // ---------- 2) 主入口：查 ORS 路线 ----------
  async searchRoutes(origin: string, destination: string) {
    const [oLat, oLng] = this.parseLatLng(origin);
    const [dLat, dLng] = this.parseLatLng(destination);

    const key = process.env.ORS_API_KEY;
    if (!key) throw new BadRequestException('ORS_API_KEY missing');

    const resp = await axios.post(
      'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
      { coordinates: [[oLng, oLat], [dLng, dLat]] },
      { headers: { Authorization: key, 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    const feature = resp.data?.features?.[0];
    if (!feature) {
      return { origin: [oLat, oLng], destination: [dLat, dLng], routes: [] };
    }

    const routes: RouteCandidate[] = [{
      provider: 'openrouteservice',
      distanceMeters: Number(feature?.properties?.summary?.distance) || 0,
      durationSeconds: Number(feature?.properties?.summary?.duration) || 0,
      geometry: feature.geometry,
    }];

    //rankRoutes 需要查 DB，所以是 async
    const ranked = await this.rankRoutes(routes);

    return {
      origin: [oLat, oLng],
      destination: [dLat, dLng],
      routes: ranked,
    };
  }

  // ============================================================
  // 3) score = effectiveness + status/quality
  //    - effectiveness: 距离/时间越小越好
  //    - quality/status: 来自 MergedSegment（publishable reports merge）
  // ============================================================
  async rankRoutes(routes: RouteCandidate[]) {
    if (!Array.isArray(routes) || routes.length === 0) return [];

    // --- effectiveness: 用 routes 内部做归一化（多条时才有意义）
    const distances = routes.map(r => Number(r.distanceMeters)).filter(Number.isFinite);
    const durations = routes.map(r => Number(r.durationSeconds)).filter(Number.isFinite);

    const hasDistanceData = distances.length === routes.length && routes.length > 0;
    const hasDurationData = durations.length === routes.length && routes.length > 0;

    const minD = hasDistanceData ? Math.min(...distances) : 0;
    const maxD = hasDistanceData ? Math.max(...distances) : 0;
    const minT = hasDurationData ? Math.min(...durations) : 0;
    const maxT = hasDurationData ? Math.max(...durations) : 0;

    const norm01 = (v: number, min: number, max: number) => {
      if (!Number.isFinite(v)) return 0.5;
      if (max === min) return 1.0;
      return (v - min) / (max - min);
    };

    // 权重
    const W_EFFECT = 0.5;
    const W_QUALITY = 0.5;

    // 逐条路线：算 quality（需要 DB）
    const scored = await Promise.all(routes.map(async (r) => {
      const dist = Number(r.distanceMeters);
      const dur = Number(r.durationSeconds);

      // effectiveness：距离短+时间短 => 高分（反向），只看距离+时间，这条路有多划算？
      let effectiveness = 0.5; // 默认中性
      if (routes.length === 1) {
        // 单条路线：没法在候选间归一化，就用一个稳定的函数（避免永远 1.0 的假象）
        effectiveness = this.effectivenessSingleRoute(dist, dur);
      } else {
        const dist01 = hasDistanceData ? norm01(dist, minD, maxD) : 0.5;
        const dur01 = hasDurationData ? norm01(dur, minT, maxT) : 0.5;
        effectiveness = 0.5 * (1 - dist01) + 0.5 * (1 - dur01);
      }

      // quality：从 DB 的 MergedSegment 来（若无 merged，则按 publishable reports 现场合并）
      const qualityResult = await this.computeRouteQualityFromDb(r.geometry);

      const quality = qualityResult.qualityScore;       // 0..1
      const evidence = qualityResult.evidenceScore;     // 0..1

      const scoreRaw = W_EFFECT * effectiveness + W_QUALITY * quality;

      // confidence：证据不足（没匹配到 segment 或 evidence 很低）就 low
      const lowConfidence = evidence < 0.35;

      return {
        ...r,
        score: Number(scoreRaw.toFixed(4)),
        scoring: {
          effectiveness: Number(effectiveness.toFixed(4)),
          quality: Number(quality.toFixed(4)),
          evidence: Number(evidence.toFixed(4)),
        },
        confidence: lowConfidence ? 'low' : 'high',
      } as RouteCandidate;
    }));

    // 排序 + rank
    scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return scored.map((r, idx) => ({ ...r, rank: idx + 1 }));
  }

  // ---------- 单条路线时的 effectiveness（稳定、可解释） ----------
  private effectivenessSingleRoute(distanceMeters: number, durationSeconds: number) {
    // 用两个“软阈值”做压缩：越短越接近 1，越长越接近 0
    const d0 = 3000;   // 3km
    const t0 = 1200;   // 20min
    const dScore = 1 / (1 + (Math.max(0, distanceMeters) / d0));
    const tScore = 1 / (1 + (Math.max(0, durationSeconds) / t0));
    return 0.5 * dScore + 0.5 * tScore; // 0..1
  }

  // ============================================================
  // 4) 路线 quality 的核心：用路线 geometry 找命中的 PathSegment，
  //    再取 MergedSegment（或现场合并 publishable reports）
  // ============================================================
  private async computeRouteQualityFromDb(routeGeometry: any): Promise<{
    qualityScore: number;   // 0..1
    evidenceScore: number;  // 0..1
    matchedSegments: number;
  }> {
    // 1) 提取路线坐标（lng,lat）
    const routeCoords = this.extractLineCoords(routeGeometry);
    if (routeCoords.length < 2) {
      return { qualityScore: 0.5, evidenceScore: 0, matchedSegments: 0 };
    }

    // 2) bbox 过滤候选 segments（纯 Prisma；大数据量可换 PostGIS）
    const bbox = this.bboxFromCoords(routeCoords); // [minLng,minLat,maxLng,maxLat]
    const expand = 0.0025; // ~ 200-300m（粗略），按需要调
    const bboxExpanded = [
      bbox[0] - expand, bbox[1] - expand,
      bbox[2] + expand, bbox[3] + expand,
    ] as const;

    // 注意：你 PathSegment.geometry 是 Json，Prisma 无法直接做空间查询
    // 所以这里只能“先拉一部分候选”，再在内存里用几何距离判断命中
    // 你可以加一个“segment bbox”字段在 DB 里来优化（可选增强）
    const candidates = await this.prisma.pathSegment.findMany({
      where: {
        geometry: { not: Prisma.DbNull }
    },

      select: {
        id: true,
        geometry: true,
        merged: {
          select: {
            mergedCondition: true,
            confidence: true,
            reportCount: true,
            latestReportAt: true,
          },
        },
      },
      take: 2000, // 防止一次拉爆；真实项目建议用 bbox 字段或 PostGIS
    });

    // 3) 几何命中：线到线最小距离 < 阈值（比如 30m）则认为路线经过该 segment
    const HIT_THRESHOLD_METERS = 30;

    const matched: Array<{
      segmentId: string;
      cond: ConditionLevel;
      mergedConfidence: number;
      reportCount: number;
      latestReportAt: Date | null;
      segmentScore01: number;
      freshnessWeight: number;
      evidenceWeight: number;
    }> = [];

    for (const seg of candidates) {
      const segCoords = this.extractLineCoords(seg.geometry);
      if (segCoords.length < 2) continue;

      // 先做 bbox 快速排除（内存）
      const sb = this.bboxFromCoords(segCoords);
      if (!this.bboxIntersects(bboxExpanded, [sb[0], sb[1], sb[2], sb[3]])) continue;

      const minDist = this.minDistanceLineToLineMeters(routeCoords, segCoords);
      if (minDist > HIT_THRESHOLD_METERS) continue;

      // 取 merged；如果没有 merged，按 publishable reports 现场合并（符合 DD）
      const merged = seg.merged ?? await this.mergeSegmentFromPublishableReports(seg.id);

      if (!merged) continue;

      const cond = merged.mergedCondition;
      const segScore01 = this.conditionToScore01(cond);

      // freshness：越新权重越大（DD 要求 freshness）
      const latest = merged.latestReportAt ?? null;
      const freshnessWeight = this.freshnessWeight(latest);

      // evidence：报告数量 + mergedConfidence（confirming data obtained）
      const evidenceWeight = this.evidenceWeight(merged.reportCount, merged.confidence);

      matched.push({
        segmentId: seg.id,
        cond,
        mergedConfidence: merged.confidence,
        reportCount: merged.reportCount,
        latestReportAt: latest,
        segmentScore01: segScore01,
        freshnessWeight,
        evidenceWeight,
      });
    }

    if (matched.length === 0) {
      // 没命中任何 segment：我们对状态几乎不了解
      return { qualityScore: 0.5, evidenceScore: 0.0, matchedSegments: 0 };
    }

    // 4) 计算路线 quality：按（freshness * evidence）加权平均 segment 状态分
    let wSum = 0;
    let sSum = 0;
    let eSum = 0;

    for (const m of matched) {
      const w = m.freshnessWeight * m.evidenceWeight;
      wSum += w;
      sSum += w * m.segmentScore01;
      eSum += Math.min(1, m.evidenceWeight); // evidence 自身也汇总一下
    }

    const qualityScore = wSum > 0 ? (sSum / wSum) : 0.5;

    // evidenceScore：命中段越多、每段 evidence 越强 → 越高（0..1）
    // 这里用一个简单饱和函数：1 - exp(-k * avgEvidence)
    const avgE = eSum / matched.length;
    const evidenceScore = 1 - Math.exp(-1.5 * avgE);

    return {
      qualityScore: this.clamp01(qualityScore),
      evidenceScore: this.clamp01(evidenceScore),
      matchedSegments: matched.length,
    };
  }

  // ============================================================
  // 5) 合并：只用 PUBLISHABLE reports，考虑 freshness + confirming count
  // ============================================================
  private async mergeSegmentFromPublishableReports(segmentId: string) {
    const reports = await this.prisma.pathReport.findMany({
      where: {
        segmentId,
        status: ReportStatus.PUBLISHABLE,
      },
      select: { condition: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200, // 防止爆
    });

    if (reports.length === 0) return null;

    // 加权投票：权重 = freshnessWeight(createdAt)
    const buckets = new Map<ConditionLevel, number>();
    let total = 0;
    let latestReportAt: Date | null = null;

    for (const r of reports) {
      const w = this.freshnessWeight(r.createdAt);
      total += w;
      buckets.set(r.condition, (buckets.get(r.condition) ?? 0) + w);
      if (!latestReportAt || r.createdAt > latestReportAt) latestReportAt = r.createdAt;
    }

    // 赢家：权重最大者
    let winner: ConditionLevel = reports[0].condition;
    let best = -1;
    for (const [cond, w] of buckets.entries()) {
      if (w > best) {
        best = w;
        winner = cond;
      }
    }

    const confidence = total > 0 ? best / total : 0.5;
    const reportCount = reports.length;

    // 这里“现场合并”不写入 MergedSegment（避免写扩散）
    // 你也可以选择 upsert 到 MergedSegment（更快），但不是必须。
    return {
      mergedCondition: winner,
      confidence: this.clamp01(confidence),
      reportCount,
      latestReportAt: latestReportAt ?? new Date(),
    };
  }

  // ---------- freshness 权重：越新越大 ----------
  private freshnessWeight(dt: Date | null) {
    if (!dt) return 0.4;
    const ageMs = Date.now() - dt.getTime();
    const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
    // 半衰期：30 天（按你们项目节奏可调）
    const halfLife = 30;
    return Math.pow(0.5, ageDays / halfLife); // 1, 0.5, 0.25...
  }

  // ---------- evidence 权重：confirming data（数量）+ mergedConfidence ----------
  private evidenceWeight(reportCount: number, mergedConfidence: number) {
    // count 饱和：1 - exp(-k*count)
    const c = Math.max(0, reportCount ?? 0);
    const countScore = 1 - Math.exp(-0.35 * c); // 0..1
    const confScore = this.clamp01(Number(mergedConfidence ?? 0.5));
    // 二者平均（你可调权重）
    return 0.5 * countScore + 0.5 * confScore;
  }

  // ---------- condition -> 0..1（按 DD 的“status”好坏） ----------
  private conditionToScore01(c: ConditionLevel) {
    switch (c) {
      case ConditionLevel.OPTIMAL: return 1.0;
      case ConditionLevel.MEDIUM: return 0.7;
      case ConditionLevel.SUFFICIENT: return 0.45;
      case ConditionLevel.MAINTENANCE: return 0.1;
      default: return 0.5;
    }
  }

  // ============================================================
  // 6) GeoJSON 辅助：提取坐标、bbox、线线最小距离（纯 TS）
  // ============================================================
  private extractLineCoords(geo: any): Array<[number, number]> {
    // 期待 route geometry: LineString { coordinates: [[lng,lat],...] }
    if (!geo) return [];
    const t = geo.type;

    if (t === 'LineString' && Array.isArray(geo.coordinates)) {
      return geo.coordinates
        .map((p: any) => [Number(p[0]), Number(p[1])] as [number, number])
        .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    }

    // MultiLineString：拼接
    if (t === 'MultiLineString' && Array.isArray(geo.coordinates)) {
      const out: Array<[number, number]> = [];
      for (const line of geo.coordinates) {
        if (!Array.isArray(line)) continue;
        for (const p of line) {
          const lng = Number(p?.[0]);
          const lat = Number(p?.[1]);
          if (Number.isFinite(lng) && Number.isFinite(lat)) out.push([lng, lat]);
        }
      }
      return out;
    }

    // 如果你存的是 Feature / FeatureCollection
    if (t === 'Feature' && geo.geometry) return this.extractLineCoords(geo.geometry);

    return [];
  }

  private bboxFromCoords(coords: Array<[number, number]>): [number, number, number, number] {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    return [minLng, minLat, maxLng, maxLat];
  }

  private bboxIntersects(
    a: readonly [number, number, number, number],
    b: readonly [number, number, number, number]
  ) {
    const [aMinX, aMinY, aMaxX, aMaxY] = a;
    const [bMinX, bMinY, bMaxX, bMaxY] = b;
    return !(aMaxX < bMinX || aMinX > bMaxX || aMaxY < bMinY || aMinY > bMaxY);
  }

  // 线-线最小距离：粗略但可用（以采样点近似）
  private minDistanceLineToLineMeters(
    lineA: Array<[number, number]>,
    lineB: Array<[number, number]>
  ) {
    // 采样降低计算量（可调）
    const sample = (line: Array<[number, number]>, step: number) =>
      line.filter((_, i) => i % step === 0 || i === line.length - 1);

    const A = sample(lineA, Math.max(1, Math.floor(lineA.length / 60)));
    const B = sample(lineB, Math.max(1, Math.floor(lineB.length / 60)));

    let best = Infinity;

    // 点到折线距离：点到每个线段的最小距离
    for (const p of A) {
      const d = this.pointToPolylineMinDistMeters(p, B);
      if (d < best) best = d;
    }
    for (const p of B) {
      const d = this.pointToPolylineMinDistMeters(p, A);
      if (d < best) best = d;
    }

    return best;
  }

  private pointToPolylineMinDistMeters(
    p: [number, number],
    line: Array<[number, number]>
  ) {
    let best = Infinity;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const d = this.pointToSegmentDistanceMeters(p, a, b);
      if (d < best) best = d;
    }
    return best;
  }

  // 点到线段距离（将经纬度近似投影到米，适用于小范围）
  private pointToSegmentDistanceMeters(
    p: [number, number],
    a: [number, number],
    b: [number, number]
  ) {
    // 将 lng/lat 转到平面（equirectangular）
    const toXY = ([lng, lat]: [number, number]) => {
      const R = 6371000;
      const x = (lng * Math.PI / 180) * R * Math.cos((lat * Math.PI / 180));
      const y = (lat * Math.PI / 180) * R;
      return [x, y] as [number, number];
    };

    const [px, py] = toXY(p);
    const [ax, ay] = toXY(a);
    const [bx, by] = toXY(b);

    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;

    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) return Math.hypot(px - ax, py - ay);

    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));

    const cx = ax + t * abx;
    const cy = ay + t * aby;

    return Math.hypot(px - cx, py - cy);
  }

  private clamp01(x: number) {
    if (!Number.isFinite(x)) return 0.5;
    return Math.max(0, Math.min(1, x));
  }
}*/
