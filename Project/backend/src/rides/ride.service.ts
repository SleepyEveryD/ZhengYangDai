import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoadCondition } from '@prisma/client';

interface ConfirmRideInput {
  rideId: string;
  userId: string;
  payload: any;
}

@Injectable()
export class RideService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 保存 Draft Ride（只存路线）
   */
  async saveDraftRide(rideId: string, userId: string, routeGeoJson: any) {
    // 你原来留空的话也行；给你一个最小可用保存（可选）
    // 如果你不想写库，直接 return { ok: true } 也可以
    await this.prisma.ride.upsert({
      where: { id: rideId },
      create: {
        id: rideId,
        userId,
        routeGeoJson,
        status: 'DRAFT',
        startedAt: new Date(),
        endedAt: new Date(),
      },
      update: {
        routeGeoJson,
        status: 'DRAFT',
      },
    });

    return { ok: true };
  }

  /**
   * Confirm Ride（DRAFT → CONFIRMED）
   * payload 来自前端 body（Controller 已校验 status=CONFIRMED）
   */
  async confirmRide({ rideId, userId, payload }: ConfirmRideInput) {
    const {
      startedAt,
      endedAt,
      routeGeoJson,
      streets,
      roadConditionSegments,
      // issues 你未来也可以在这里处理（目前先忽略）
    } = payload;

    if (!routeGeoJson) {
      throw new BadRequestException('routeGeoJson is required');
    }
    if (!Array.isArray(streets) || streets.length === 0) {
      throw new BadRequestException('streets is required and must be a non-empty array');
    }

    // externalId -> { roadCondition, notes }
    const segMap = new Map<string, { roadCondition: RoadCondition; notes: string | null }>();
    for (const seg of roadConditionSegments ?? []) {
      if (!seg?.streetExternalId) continue;

      // 容错：前端传 string，prisma enum 接得住
      const cond = (seg.condition ?? 'GOOD') as RoadCondition;

      segMap.set(seg.streetExternalId, {
        roadCondition: cond,
        notes: seg.notes?.trim() ? String(seg.notes).trim() : null,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      /* -------------------------------
       * 1. Create / Confirm Ride
       * ------------------------------- */
      await tx.$executeRaw`
        INSERT INTO "Ride" (
          id,
          "userId",
          "routeGeoJson",
          "routeGeometry",
          status,
          "startedAt",
          "endedAt"
        )
        VALUES (
          ${rideId},
          ${userId},
          ${routeGeoJson}::jsonb,
          ST_SetSRID(
            ST_GeomFromGeoJSON(${JSON.stringify(routeGeoJson)}),
            4326
          ),
          'CONFIRMED'::"RideStatus",
          ${startedAt ? new Date(startedAt) : new Date()},
          ${endedAt ? new Date(endedAt) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE
        SET
          "userId" = EXCLUDED."userId",
          "routeGeoJson" = EXCLUDED."routeGeoJson",
          "routeGeometry" = EXCLUDED."routeGeometry",
          status = 'CONFIRMED'::"RideStatus",
          "startedAt" = EXCLUDED."startedAt",
          "endedAt" = EXCLUDED."endedAt"
      `;

      /* -------------------------------
       * 2. Streets & Reports
       * ------------------------------- */
      for (const street of streets) {
        if (!street?.externalId) continue;

        const geometry = {
          type: 'LineString',
          coordinates: (street.positions ?? []).map((p: any) => p.coord),
        };

        // 2.1 Upsert Street by externalId (raw SQL)
        const [streetRecord] = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO "Street" (
            id,
            "externalId",
            name,
            city,
            country,
            "geometryJson",
            geometry
          )
          VALUES (
            gen_random_uuid(),
            ${street.externalId},
            ${street.name ?? null},
            ${street.city ?? null},
            ${street.country ?? null},
            ${geometry}::jsonb,
            ST_SetSRID(
              ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),
              4326
            )
          )
          ON CONFLICT ("externalId") DO UPDATE
          SET
            name = EXCLUDED.name,
            city = EXCLUDED.city,
            country = EXCLUDED.country,
            "geometryJson" = EXCLUDED."geometryJson",
            geometry = EXCLUDED.geometry
          RETURNING id
        `;

        // 2.2 Upsert StreetReport by @@unique(userId, rideId, streetId)
        const input = segMap.get(street.externalId);
        const roadCondition: RoadCondition = input?.roadCondition ?? 'GOOD';
        const notes: string | null = input?.notes ?? null;

        await tx.streetReport.upsert({
          where: {
            user_ride_street_unique: {
              userId,
              rideId,
              streetId: streetRecord.id,
            },
          },
          create: {
            userId,
            rideId,
            streetId: streetRecord.id,
            roadCondition,
            notes,
          },
          update: {
            roadCondition,
            notes,
          },
        });
      }

      return { success: true, rideId };
    });
  }

  /**
   * 获取 Ride 详情（包含关联的 reports）
   */
  async getRide(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        reports: true,
        issues: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }

  /**
   * 获取用户的所有 Rides
   */
  async getUserRides(userId: string) {
    return this.prisma.ride.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reports: true,
        issues: true,
      },
    });
  }
}
