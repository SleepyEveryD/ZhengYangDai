import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveRideSegmentsDto } from './dto/save-ride-segments.dto';
import { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';



@Injectable()
export class RideService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 保存 Draft Ride Segments + Reports（整批替换，原子操作）
   */
   async saveDraftSegments(
    rideId: string,
    userId: string,
    dto: SaveRideSegmentsDto,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prisma = tx as any;
  
        let ride = await prisma.ride.findUnique({
          where: { id: rideId },
        });
  
        if (!ride) {
          ride = await prisma.ride.create({
            data: {
              id: rideId,
              userId,
              status: 'DRAFT',
            },
          });
        }
  
        if (ride.userId !== userId) {
          throw new ForbiddenException();
        }
  
        if (ride.status !== 'DRAFT') {
          throw new ForbiddenException('Ride already confirmed');
        }
  
        await prisma.rideSegment.deleteMany({
          where: { rideId },
        });
  
        for (const seg of dto.segments) {
          console.log('🧪 SEG.geometry =', JSON.stringify(seg.geometry));
  
          const segment = await prisma.rideSegment.create({
            data: {
              rideId,
              orderIndex: seg.orderIndex,
              geometry: seg.geometry,
              lengthM: seg.lengthM,
            },
          });
  
          await prisma.rideSegmentReport.create({
            data: {
              rideSegmentId: segment.id,
              roadCondition: seg.report.roadCondition,
              issueType: seg.report.issueType ?? 'NONE',
              notes: seg.report.notes,
            },
          });
        }
  
        return { ok: true };
      });
    } catch (err) {
      console.error('🔥 saveDraftSegments ERROR:', err);
      throw err; // 关键：不要吞
    }
  }
  
  
  

  /**
   * Confirm Ride（DRAFT → CONFIRMED）
   * 当前 schema 里没有 published/confirmedAt，所以这里只更新 status
   */
  async confirmRide(rideId: string, userId: string, _publish: boolean) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.userId !== userId) throw new ForbiddenException('Not your ride');
    if (ride.status !== 'DRAFT') throw new ConflictException('Ride already confirmed');

    await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'CONFIRMED' },
    });

    return { ok: true };
  }
}
