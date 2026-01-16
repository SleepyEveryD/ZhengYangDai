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
  
      // 2️⃣ 业务校验（不是 Auth）
      if (ride.userId !== userId) {
        throw new ForbiddenException('Not your ride');
      }
  
      if (ride.status !== 'DRAFT') {
        throw new ConflictException(
          'Ride already confirmed, cannot modify segments',
        );
      }
  
      // 3️⃣ Prisma Transaction：整批替换
      await this.prisma.$transaction(async (tx) => {
        // 删除旧 segments（cascade 会删 report）
        await tx.rideSegment.deleteMany({
          where: { rideId },
        });
  
        // 重建 segments + reports
        for (const s of dto.segments) {
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
  }
  