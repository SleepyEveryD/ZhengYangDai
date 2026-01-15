import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConditionLevel, ReportStatus } from '@prisma/client';

@Injectable()
export class PathReportService {
  constructor(private prisma: PrismaService) {}

  // 新：从 supabaseUid(JWT sub) 创建 Draft
  async createDraftBySupabaseUid(
    supabaseUid: string,
    dto: { segmentId: string; condition: string; notes?: string },
  ) {
    if (!supabaseUid) throw new UnauthorizedException('Missing user token');

    // 1) 用 supabaseUid 找到你们系统的 User
    let user = await this.prisma.user.findUnique({ where: { supabaseUid } });

    // 2) demo 友好：如果 User 表还没同步，就自动创建一个占位用户
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          supabaseUid,
          // 先给一个占位 email，等你们 auth 完整同步后可删掉这段
          email: `${supabaseUid}@placeholder.local`,
        },
      });
    }

    // 3) 写入 PathReport（注意：这里用的是 user.id）
    return this.prisma.pathReport.create({
      data: {
        userId: user.id,
        segmentId: dto.segmentId,
        condition: dto.condition as ConditionLevel,
        notes: dto.notes,
        status: ReportStatus.DRAFT,
      },
    });
  }

  async confirm(id: string) {
    const report = await this.prisma.pathReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== ReportStatus.DRAFT) throw new BadRequestException('Only DRAFT can be CONFIRMED');

    return this.prisma.pathReport.update({
      where: { id },
      data: { status: ReportStatus.CONFIRMED },
    });
  }

  async publish(id: string) {
    const report = await this.prisma.pathReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== ReportStatus.CONFIRMED) throw new BadRequestException('Only CONFIRMED can be PUBLISHABLE');

    return this.prisma.pathReport.update({
      where: { id },
      data: { status: ReportStatus.PUBLISHABLE },
    });
  }

  async getMyReportsBySupabaseUid(supabaseUid: string) {
    if (!supabaseUid) return [];
    
    const user = await this.prisma.user.findUnique({ where: { supabaseUid } });
    if (!user) return [];
    
    return this.prisma.pathReport.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
    });
}
}
