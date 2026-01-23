import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

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
      const prisma = tx as any; // ✅ 关键：解决 Prisma v5 delegate 类型问题

      let ride = await prisma.ride.findUnique({
        where: { id: rideId },
      });

      if (!ride) {
        ride = await prisma.ride.create({
          data: {
            id: rideId,
            userId,
            status: 'DRAFT',
            routeGeoJson,
          },
        });
      } else {
        if (ride.userId !== userId) {
          throw new ForbiddenException();
        }
        if (ride.status !== 'DRAFT') {
          throw new ForbiddenException('Ride already confirmed');
        }

        await prisma.ride.update({
          where: { id: rideId },
          data: { routeGeoJson },
        });
      }

      return { ok: true };
    });
  }

  /**
   * Confirm Ride（DRAFT → CONFIRMED）
   * Google Roads API → Street → RideStreet
   */
  async confirmRide(
    rideId: string,
    userId: string,
    _publish: boolean,
  ) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.userId !== userId) throw new ForbiddenException('Not your ride');
    if (ride.status !== 'DRAFT') {
      throw new ConflictException('Ride already confirmed');
    }

    if (!ride.routeGeoJson) {
      throw new ConflictException('Ride has no routeGeoJson');
    }

    // ✅ 关键：显式 cast GeoJSON
    const geo = ride.routeGeoJson as any;
    const coordinates: number[][] = geo.coordinates;

    if (!coordinates || coordinates.length < 2) {
      throw new ConflictException('Invalid route geometry');
    }

    // 1️⃣ Google Roads API
    const path = coordinates
      .map(([lng, lat]) => `${lat},${lng}`)
      .join('|');

    const roadsRes = await axios.get(
      'https://roads.googleapis.com/v1/snapToRoads',
      {
        params: {
          path,
          interpolate: true,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000,
      },
    );

    const snappedPoints = roadsRes.data?.snappedPoints ?? [];

    const placeIds = new Set<string>();
    for (const p of snappedPoints) {
      if (p.placeId) placeIds.add(p.placeId);
    }

    if (placeIds.size === 0) {
      throw new ConflictException('No streets detected from route');
    }

    // 2️⃣ Street + RideStreet + 更新 Ride
    await this.prisma.$transaction(async (tx) => {
      const prisma = tx as any; // ✅ 再次 cast

      await prisma.rideStreet.deleteMany({
        where: { rideId },
      });

      for (const placeId of placeIds) {
        const externalId = `google:${placeId}`;

        const street = await prisma.street.upsert({
          where: { externalId },
          update: {},
          create: { externalId },
        });

        await prisma.rideStreet.create({
          data: {
            rideId,
            streetId: street.id,
          },
        });
      }

      await prisma.ride.update({
        where: { id: rideId },
        data: { status: 'CONFIRMED' },
      });
    });

    return { ok: true };
  }
}
