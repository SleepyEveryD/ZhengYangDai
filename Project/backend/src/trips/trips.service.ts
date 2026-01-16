import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StartTripDto } from "./dto/start-trip.dto";
import { StopTripDto } from "./dto/stop-trip.dto";
import { TripStatus } from "@prisma/client";

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  async startTrip(dto: StartTripDto) {
    // 如果已有正在录制的 trip，直接返回（避免重复创建）
    const existing = await this.prisma.trip.findFirst({
      where: { userId: dto.userId, status: TripStatus.RECORDING },
      orderBy: { startedAt: "desc" },
    });

    if (existing) return existing;

    return this.prisma.trip.create({
      data: {
        userId: dto.userId,
        status: TripStatus.RECORDING,
        startedAt: new Date(),
        // distance/duration/avgSpeed 先不填（null）
      },
    });
  }

  async stopTrip(dto: StopTripDto) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
    });

    if (!trip) throw new BadRequestException("Trip not found");
    if (trip.status !== TripStatus.RECORDING)
      throw new BadRequestException("Trip is not recording");

    const avgSpeed =
      dto.duration > 0 ? dto.distance / (dto.duration / 3600) : 0;

    return this.prisma.trip.update({
      where: { id: dto.tripId },
      data: {
        status: TripStatus.COMPLETED,
        stoppedAt: new Date(),
        distance: dto.distance,
        duration: dto.duration,
      },
    });
  }

  async getTripHistory(userId: string) {
    return this.prisma.trip.findMany({
      where: { userId, status: TripStatus.COMPLETED },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
  }
}
