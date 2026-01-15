import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PathReportService } from './path-report.service';
import { CreateDraftDto } from './dto/create-draft.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('path-reports')
export class PathReportController {
  constructor(private service: PathReportService) {}

  @Post('draft')
  @UseGuards(AuthGuard)
  createDraft(@Req() req: any, @Body() dto: CreateDraftDto) {
    const supabaseUid = req.user?.sub;
    return this.service.createDraftBySupabaseUid(supabaseUid, dto);
  }

  // ✅ 新增：拿“当前登录用户”的 reports
  @Get('me')
  @UseGuards(AuthGuard)
  getMyReports(@Req() req: any) {
    const supabaseUid = req.user?.sub;
    return this.service.getMyReportsBySupabaseUid(supabaseUid);
  }

  @Put(':id/confirm')
  @UseGuards(AuthGuard)
  confirm(@Param('id') id: string) {
    return this.service.confirm(id);
  }

  @Put(':id/publish')
  @UseGuards(AuthGuard)
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }
}
