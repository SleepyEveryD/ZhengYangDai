import {
  Body,
  Controller,
  Param,
  Put,
  Post,
  Get,
  UseGuards,
  Req,
  BadRequestException,
  Query,
} from '@nestjs/common';

import { RideService } from './ride.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('rides')
export class RideController {
  constructor(private readonly rideService: RideService) {
    //console.log('🔥 RideController LOADED');
  }

  /**
   * PUT /rides/:rideId/save
   * 保存 Draft Ride（只保存路线）
   */
  @UseGuards(SupabaseAuthGuard)
  @Put(':rideId/save')
  async saveDraftRide(
    @Param('rideId') rideId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;

    // ✅ 必须是 DRAFT
    if (body.status !== 'DRAFT') {
      throw new BadRequestException(
        'Ride status must be DRAFT when saving draft',
      );
    }

    // ✅ 防止前端 rideId 不一致
    if (body.id && body.id !== rideId) {
      throw new BadRequestException('Ride ID mismatch');
    }

    // ✅ 必须有 routeGeoJson
    if (!body.routeGeoJson) {
      throw new BadRequestException('routeGeoJson is required');
    }

    return this.rideService.saveDraftRide(
      rideId,
      userId,
      body.routeGeoJson,
    );
  }

  /**
   * POST /rides/:rideId/confirm
   * Confirm Ride（DRAFT → CONFIRMED）
   */
  @UseGuards(SupabaseAuthGuard)
  @Post(':rideId/confirm')
  async confirmRide(
    @Param('rideId') rideId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user.id;

    // ✅ 必须是 CONFIRMED
    if (body.status !== 'CONFIRMED') {
      throw new BadRequestException('Ride must be in CONFIRMED status to confirm');
    }

    // ✅ 防止前端传错 rideId
    if (body.id && body.id !== rideId) {
      throw new BadRequestException('Ride ID mismatch');
    }

    return this.rideService.confirmRide({
      rideId,
      userId,
      payload: body,
    });
  }

  // myRide page
  @UseGuards(SupabaseAuthGuard)
  @Get()
  async getMyRides(
    @Req() req: any,
    @Query("page") page = "1",
    @Query("limit") limit = "20"
  ) {
    const userId = req.user.userId;

    return this.rideService.getUserRides({
      userId,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @UseGuards(SupabaseAuthGuard)
  @Get(":rideId")
  async getRideDetail(
    @Req() req: any,
    @Param("rideId") rideId: string
  ) {
    const userId = req.user.userId;
    return this.rideService.getRideDetail(userId, rideId);
  }

  
  
}
