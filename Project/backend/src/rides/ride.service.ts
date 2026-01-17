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
   * 保存 Draft Ride Segments + Reports（整批替换，原子操作）
   */
  async saveDraftSegments(rideId: string, userId: string, dto: SaveRideSegmentsDto) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.userId !== userId) throw new ForbiddenException('Not your ride');
    if (ride.status !== 'DRAFT') {
      throw new ConflictException('Ride already confirmed, cannot modify segments');
    }

    const ops: any[] = [];

    // 删除旧 segments（cascade 会删 report）
    ops.push(this.prisma.rideSegment.deleteMany({ where: { rideId } }));

    // 重建 segments + report（用嵌套写入，避免 tx.delegate.create 的类型坑）
    for (const s of dto.segments) {
      ops.push(
        (this.prisma as any).rideSegment.create({
          data: {
            rideId,
            orderIndex: s.orderIndex,
            geometry: s.geometry,
            lengthM: s.lengthM,
            report: {
              create: {
                roadCondition: s.report.roadCondition,
                issueType: s.report.issueType ?? 'NONE',
                notes: s.report.notes,
              },
            },
          },
        }),
      );
    }

    await this.prisma.$transaction(ops);
    return { ok: true };
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
