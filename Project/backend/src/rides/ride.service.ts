import {
  ConflictException,
  Injectable,
  NotFoundException,
  Query
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toGeoJSONPointFromFrontend } from '../util/geojson.util';


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
/**
 * 保存 Draft Ride（只存路线，不涉及 streets / reports）
 * - 可多次调用（幂等）
 * - 只写 Ride 表
 * - 状态始终为 DRAFT
 */
 async saveDraftRide(
  rideId: string,
  userId: string,
  routeGeoJson: any,
) {
  return this.prisma.$transaction(async (tx) => {
    const existing = await tx.ride.findUnique({
      where: { id: rideId },
      select: { status: true },
    });

    if (existing?.status === 'CONFIRMED') {
      throw new ConflictException('Ride already confirmed');
    }

    console.log(
      '🧭 routeGeoJson',
      JSON.stringify(routeGeoJson, null, 2),
    );

    try {
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
          'DRAFT'::"RideStatus",
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET
          "routeGeoJson" = EXCLUDED."routeGeoJson",
          "routeGeometry" = EXCLUDED."routeGeometry",
          "userId" = EXCLUDED."userId",
          status = 'DRAFT'::"RideStatus"
      `;
    } catch (e) {
      console.error('🔥 saveDraftRide SQL error', e);
      throw e;
    }

    return { success: true, rideId };
  });
}



  /**
   * Confirm Ride（DRAFT → CONFIRMED）
   * 使用 mock street（不调用外部 API）
   */
   async confirmRide({ rideId, userId, payload }: ConfirmRideInput) {
    const {
      startedAt,
      endedAt,
      routeGeoJson,
      streets,
      issues,
    } = payload;
  
    return this.prisma.$transaction(async (tx) => {
      /* --------------------------------
       * 1. Create / Confirm Ride
       * -------------------------------- */
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
          )::geography,
          'CONFIRMED'::"RideStatus",
          ${new Date(startedAt)},
          ${new Date(endedAt)}
        )
        ON CONFLICT (id) DO NOTHING
      `;
  
      /* --------------------------------
       * 2. Streets & StreetReports
       * -------------------------------- */
      for (const street of streets) {
        const geometry = {
          type: 'LineString',
          coordinates: street.positions.map((p: any) => p.coord),
        };
  
        // 2.1 查是否存在同名 + 1km 内的 Street
        const existingStreet = await tx.$queryRaw<{ id: string }[]>`
          SELECT id
          FROM "Street"
          WHERE
            name = ${street.name}
            AND city = ${street.city}
            AND country = ${street.country}
            AND geometry IS NOT NULL
            AND ST_DWithin(
              geometry,
              ST_SetSRID(
                ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),
                4326
              )::geography,
              1000
            )
          LIMIT 1
        `;
  
        let streetId: string;
  
        // 2.2 复用或创建 Street
        if (existingStreet.length > 0) {
          streetId = existingStreet[0].id;
        } else {
          const [newStreet] = await tx.$queryRaw<{ id: string }[]>`
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
              ${street.name},
              ${street.city},
              ${street.country},
              ${geometry}::jsonb,
              ST_SetSRID(
                ST_GeomFromGeoJSON(${JSON.stringify(geometry)}),
                4326
              )::geography
            )
            RETURNING id
          `;
          streetId = newStreet.id;
        }
  
        // 2.3 创建 StreetReport（幂等）
        const existingReport = await tx.streetReport.findFirst({
          where: {
            userId,
            rideId,
            streetId,
          },
        });
  
        if (!existingReport) {
          await tx.streetReport.create({
            data: {
              userId,
              rideId,
              streetId,
              roadCondition: 'GOOD',
            },
          });
        }
      }
  
      /* --------------------------------
       * 3. Insert StreetIssues (RAW SQL)
       * -------------------------------- */
      for (const issue of issues ?? []) {
        const point = toGeoJSONPointFromFrontend(issue.location);
      
        if (!point) continue;
      
        const geojsonStr = JSON.stringify(point);
      
        await tx.$executeRaw`
          INSERT INTO "StreetIssue" (
            id,
            "userId",
            "rideId",
            "issueType",
            "locationJson",
            location,
            notes
          )
          VALUES (
            gen_random_uuid(),
            ${userId},
            ${rideId},
            ${issue.type.toUpperCase()}::"IssueType",
            ${geojsonStr}::jsonb,
            ST_SetSRID(
              ST_GeomFromGeoJSON(${geojsonStr}),
              4326
            )::geography,
            ${issue.description ?? null}
          )
        `;
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
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }


  async getUserRides(params: {
    userId: string;
    page: number;
    limit: number;
  }) {
    const { userId, page, limit } = params;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.ride.findMany({
  where: { userId },
  orderBy: { startedAt: "desc" },
  skip,
  take: limit,
  select: {
    id: true,
    startedAt: true,
    endedAt: true,
    issues: {
      select: {
        id: true,
        issueType: true,
        createdAt: true,
      },
    },
  },
}),
      this.prisma.ride.count({
        where: { userId },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async getRideDetail(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id: rideId,
        userId, // 🔒 防止越权
      },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        routeGeoJson: true, // ✅ 路线数据
        issues: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            issueType: true,
            locationJson: true,
            notes: true,
            createdAt: true,
          },
        },
        reports: {
          orderBy: { createdAt: "asc" },
          include: {
            street: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
          },
        },
      },
    });
  
    if (!ride) {
      throw new NotFoundException("Ride not found");
    }
  
    return ride;
  }
  
  
  
}
