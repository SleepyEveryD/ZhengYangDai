import {
  Body,
  Controller,
  Param,
  Put,
  Post,
  Get,
  UseGuards,
  Req,
  BadRequestException
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
   * GET /rides/:rideId
   * 获取 Ride 详情
   */

  @UseGuards(SupabaseAuthGuard)
  @Post(':rideId/confirm')
  async confirmRide(
    @Param('rideId') rideId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
  
    // ✅ 必须是 CONFIRMED
    if (body.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Ride must be in CONFIRMED status to confirm',
      );
    }
  
    // （可选但推荐）防止前端传错 rideId
    if (body.id && body.id !== rideId) {
      throw new BadRequestException('Ride ID mismatch');
    }
  
    return this.rideService.confirmRide({
      rideId,
      userId,
      payload: body,
    });
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