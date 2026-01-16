// src/rides/ride.service.ts
import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { SaveRideSegmentsDto } from './dto/save-ride-segments.dto';
  
  @Injectable()
  export class RideService {
    constructor(private readonly prisma: PrismaService) {}
  
    /**
     * 保存 Draft Ride Segments + Reports
     * （整批替换，原子操作）
     */
    async saveDraftSegments(
      rideId: string,
      userId: string,
      dto: SaveRideSegmentsDto,
    ) {
      // 1️⃣ 查询 Ride
      const ride = await this.prisma.ride.findUnique({
        where: { id: rideId },
      });
  
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }
  
      // 2️⃣ 业务校验
      if (ride.userId !== userId) {
        throw new ForbiddenException('Not your ride');
      }
  
      if (ride.status !== 'DRAFT') {
        throw new ConflictException(
          'Ride already confirmed, cannot modify segments',
        );
      }
  
      // ✅【新增】防御：必须至少有一个 segment
      if (!dto.segments || dto.segments.length === 0) {
        throw new ConflictException('Ride must contain at least one segment');
      }
  
      // 3️⃣ Prisma Transaction：整批替换
      await this.prisma.$transaction(async (tx) => {
        // 删除旧 segments（cascade 会删 report）
        await tx.rideSegment.deleteMany({
          where: { rideId },
        });
  
        // 重建 segments + reports
        for (const s of dto.segments) {
          // ✅【新增】防御：每个 segment 必须有 report
          if (!s.report || !s.report.roadCondition) {
            throw new ConflictException(
              'Each segment must have a road condition report',
            );
          }
  
          const segment = await tx.rideSegment.create({
            data: {
              rideId,
              orderIndex: s.orderIndex,
              geometry: s.geometry,
              lengthM: s.lengthM,
            },
          });
  
          await tx.rideSegmentReport.create({
            data: {
              rideSegmentId: segment.id,
              roadCondition: s.report.roadCondition,
              issueType: s.report.issueType ?? 'NONE',
              notes: s.report.notes,
            },
          });
        }
      });
  
      return { ok: true };
    }
  
    /**
     * ✅ STEP 3：Confirm Ride（不可逆）
     */
    async confirmRide(rideId: string, userId: string) {
      // 1️⃣ 查 Ride + Segments + Reports
      const ride = await this.prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          segments: {
            include: {
              report: true,
            },
          },
        },
      });
  
      if (!ride) {
        throw new NotFoundException('Ride not found');
      }
  
      // 2️⃣ 业务校验
      if (ride.userId !== userId) {
        throw new ForbiddenException('Not your ride');
      }
  
      if (ride.status !== 'DRAFT') {
        throw new ConflictException('Ride already confirmed');
      }
  
      if (!ride.segments || ride.segments.length === 0) {
        throw new ConflictException(
          'Cannot confirm ride without segments',
        );
      }
  
      for (const segment of ride.segments) {
        if (!segment.report) {
          throw new ConflictException(
            'All segments must have a report before confirmation',
          );
        }
      }
  
      // 3️⃣ 原子确认（只做这一件事）
      await this.prisma.$transaction(async (tx) => {
        await tx.ride.update({
          where: { id: rideId },
          data: {
            status: 'CONFIRMED',
          },
        });
      });
  
      return {
        ok: true,
        status: 'CONFIRMED',
      };
    }
  }
  