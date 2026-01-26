import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  async saveDraftRide(
    rideId: string,
    userId: string,
    routeGeoJson: any,
  ) {
    // 目前留空 / 或后续实现
    return { ok: true };
  }

  /**
   * Confirm Ride（DRAFT → CONFIRMED）
   * 使用 mock street（不调用外部 API）
   */
  async confirmRide({ rideId, userId, payload }: ConfirmRideInput) {
    const { startedAt, endedAt, routeGeoJson, streets } = payload;

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
          ${new Date(startedAt)},
          ${new Date(endedAt)}
        )
        ON CONFLICT (id) DO NOTHING
      `;

      /* -------------------------------
       * 2. Streets & Reports
       * ------------------------------- */
      for (const street of streets) {
        const geometry = {
          type: 'LineString',
          coordinates: street.positions.map((p: any) => p.coord),
        };

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
            ${street.name},
            ${street.city},
            ${street.country},
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
            country = EXCLUDED.country
          RETURNING id
        `;

        const existingReport = await tx.streetReport.findFirst({
          where: {
            userId,
            rideId,
            streetId: streetRecord.id,
          },
        });
        
        if (!existingReport) {
          await tx.streetReport.create({
            data: {
              userId,
              rideId,
              streetId: streetRecord.id,
              roadCondition: 'GOOD',
            },
          });
        }
        
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

  /**
   * 获取用户的所有 Rides
   */
  async getUserRides(userId: string) {
    return this.prisma.ride.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reports: true,
      },
    });
  }
}
