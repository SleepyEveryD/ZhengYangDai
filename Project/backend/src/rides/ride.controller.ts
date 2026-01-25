import {
  Body,
  Controller,
  Param,
  Put,
  Post,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RideService } from './ride.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('rides')
export class RideController {
  constructor(private readonly rideService: RideService) {
    console.log('🔥 RideController LOADED');
  }

  /**
   * PUT /rides/:rideId
   * 保存 Draft Ride（只存路线）
   * Body = GeoJSON LineString
   */
  @UseGuards(SupabaseAuthGuard)
  @Put(':rideId')
  async saveDraftRide(
    @Param('rideId') rideId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.rideService.saveDraftRide(rideId, userId, body);
  }

  /**
   * POST /rides/:rideId/confirm
   * Confirm Ride（生成 Street + RideStreet + 可选的 Report）
   * Body = { publish: boolean }
   */
  @UseGuards(SupabaseAuthGuard)
  @Post(':rideId/confirm')
  async confirmRide(
    @Param('rideId') rideId: string,
    @Body() body: { publish: boolean },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.rideService.confirmRide(rideId, userId, body.publish);
  }

  /**
   * GET /rides/:rideId
   * 获取 Ride 详情
   */
  @UseGuards(SupabaseAuthGuard)
  @Get(':rideId')
  async getRide(@Param('rideId') rideId: string) {
    return this.rideService.getRide(rideId);
  }

  /**
   * GET /rides
   * 获取当前用户的所有 Rides
   */
  @UseGuards(SupabaseAuthGuard)
  @Get()
  async getUserRides(@Req() req: any) {
    const userId = req.user.userId;
    return this.rideService.getUserRides(userId);
  }
}