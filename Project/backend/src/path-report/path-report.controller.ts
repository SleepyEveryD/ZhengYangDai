import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PathReportService } from './path-report.service';
import { CreateDraftDto } from './dto/create-draft.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('path-reports')
export class PathReportController {
  constructor(private service: PathReportService) {}

  @Post('draft')
  @UseGuards(SupabaseAuthGuard)
  createDraft(@Req() req: any, @Body() dto: CreateDraftDto) {
    const supabaseUid = req.user?.userId;
    const email = req.user?.email;
    
    return this.service.createDraftBySupabaseUid(
      supabaseUid,
      email,
      dto,
    );
  }

  // 拿“当前登录用户”的 reports
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  getMyReports(@Req() req: any) {
    const supabaseUid = req.user?.userId;
    return this.service.getMyReportsBySupabaseUid(supabaseUid);
  }

  @Put(':id/confirm')
  @UseGuards(SupabaseAuthGuard)
  confirm(@Param('id') id: string) {
    return this.service.confirm(id);
  }

  @Put(':id/publish')
  @UseGuards(SupabaseAuthGuard)
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }
}
