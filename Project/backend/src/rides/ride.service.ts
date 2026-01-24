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
      const prisma = tx as any;

      // mock route（测试阶段）
      routeGeoJson = {
        type: 'LineString',
        coordinates: [
          [116.397, 39.908],
          [116.398, 39.909],
        ],
      };

      const existing = await prisma.ride.findUnique({
        where: { id: rideId },
      });

      if (!existing) {
        await prisma.ride.create({
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
        await prisma.ride.update({
          where: { id: rideId },
          data: {
            id: rideId,
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
   * 使用 mock street（不调用 Google API）
   */
  async confirmRide(
    rideId: string,
    _userId: string,
    _publish: boolean,
  ) {
    const routeGeoJson = {
      type: 'LineString',
      coordinates: [
        [116.397, 39.908],
        [116.398, 39.909],
      ],
    };
    console.log('Prisma models:', Object.keys(this.prisma));
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== 'DRAFT') {
      throw new ConflictException('Ride already confirmed');
    }

    if (!ride.routeGeoJson) {
      ride.routeGeoJson = routeGeoJson;
      //throw new ConflictException('Ride has no routeGeoJson');
    }

    const geo = ride.routeGeoJson as any;
    const coordinates: number[][] = geo.coordinates;

    if (!coordinates || coordinates.length < 2) {
      throw new ConflictException('Invalid route geometry');
    }

    await this.prisma.$transaction(async (tx) => {
      const prisma = tx as any;

      // mock street（不使用 upsert）
      let street = await prisma.street.findFirst({
        where: { externalId: 'mock:street-1' },
      });

      if (!street) {
        street = await prisma.street.create({
          data: { externalId: 'mock:street-1' },
        });
      }

      await prisma.rideStreet.deleteMany({
        where: { rideId },
      });

      await prisma.rideStreet.create({
        data: {
          rideId,
          streetId: street.id,
        },
      });

      await prisma.ride.update({
        where: { id: rideId },
        data: {
          status: 'CONFIRMED',
        },
      });
    });

    return { ok: true };
  }
}
