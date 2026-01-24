import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    return this.prisma.$transaction(async (tx) => {
      // mock route（测试阶段）
      routeGeoJson = {
        type: 'LineString',
        coordinates: [
          [116.397, 39.908],
          [116.398, 39.909],
        ],
      };

      const existing = await tx.ride.findUnique({
        where: { id: rideId },
      });

      if (!existing) {
        await tx.ride.create({
          data: {
            id: rideId,
            userId,
            status: 'DRAFT',
            routeGeoJson,
            startedAt: new Date('2026-01-24T11:30:00.000Z'),
            endedAt: new Date('2026-01-24T12:30:00.000Z'),
          },
        });
      } else {
        await tx.ride.update({
          where: { id: rideId },
          data: {
            userId,
            status: 'DRAFT',
            routeGeoJson,
            startedAt: new Date('2026-01-24T11:30:00.000Z'),
            endedAt: new Date('2026-01-24T12:30:00.000Z'),
          },
        });
      }

      return { ok: true };
    });
  }

  /**
   * Confirm Ride（DRAFT → CONFIRMED）
   * 使用 mock street（不调用外部 API）
   */
  async confirmRide(
    rideId: string,
    userId: string,
    publish: boolean,
  ) {
    // 1. 查找 Ride
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== 'DRAFT') {
      throw new ConflictException('Ride already confirmed');
    }

    // 2. 验证 routeGeoJson
    const geo = ride.routeGeoJson as any;
    if (!geo || !geo.coordinates || geo.coordinates.length < 2) {
      throw new ConflictException('Invalid route geometry');
    }

    // 3. 在事务中处理
    await this.prisma.$transaction(async (tx) => {
      // 3.1 创建或查找 mock street
      let street = await tx.street.findUnique({
        where: { externalId: 'mock:street-1' },
      });

      if (!street) {
        street = await tx.street.create({
          data: {
            externalId: 'mock:street-1',
            name: 'Mock Street',
            city: 'Beijing',
            country: 'CN',
          },
        });
      }

      // 3.2 删除旧的 RideStreet 关系
      await tx.rideStreet.deleteMany({
        where: { rideId },
      });

      // 3.3 创建新的 RideStreet 关系
      await tx.rideStreet.create({
        data: {
          rideId,
          streetId: street.id,
          coverage: 1.0, // mock: 100% coverage
        },
      });

      // 3.4 更新 Ride 状态为 CONFIRMED
      await tx.ride.update({
        where: { id: rideId },
        data: {
          status: 'CONFIRMED',
        },
      });

      // 3.5 如果 publish = true，可以创建 StreetReport（可选）
      if (publish) {
        await tx.streetReport.upsert({
          where: {
            userId_streetId: {
              userId,
              streetId: street.id,
            },
          },
          create: {
            userId,
            streetId: street.id,
            roadCondition: 'GOOD',
            issueType: 'NONE',
            rideId,
            notes: 'Auto-generated from ride confirmation',
          },
          update: {
            roadCondition: 'GOOD',
            issueType: 'NONE',
            rideId,
            notes: 'Updated from ride confirmation',
          },
        });

        // 3.6 更新或创建 StreetAggregation
        await tx.streetAggregation.upsert({
          where: { streetId: street.id },
          create: {
            streetId: street.id,
            finalCondition: 'GOOD',
            agreementScore: 1.0,
            issueSummary: { NONE: 1 },
          },
          update: {
            finalCondition: 'GOOD',
            agreementScore: 1.0,
            issueSummary: { NONE: 1 },
          },
        });
      }
    });

    return { ok: true };
  }

  /**
   * 获取 Ride 详情（包含关联的 streets）
   */
  async getRide(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        streets: {
          include: {
            street: {
              select: {
                id: true,
                externalId: true,
                name: true,
                city: true,
                country: true,
              },
            },
          },
        },
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
        streets: {
          include: {
            street: {
              select: {
                id: true,
                externalId: true,
                name: true,
                city: true,
                country: true,
              },
            },
          },
        },
      },
    });
  }
}