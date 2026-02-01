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

@Controller('api/rides')
export class RideController {
  constructor(private readonly rideService: RideService) {
    console.log('🔥 RideController LOADED');
  }

  /**
   * PUT /rides/:rideId/save
   *  Draft Ride Save
   */
   @UseGuards(SupabaseAuthGuard)
   @Put(':rideId/save')
   async saveDraftRide(
     @Param('rideId') rideId: string,
     @Body() body: any,
     @Req() req: any,
   ) {
     const userId = req.user.id;
   
   
     // if body.payload exists, use it; otherwise, use body itself
     const payload = body.payload ?? body;
  
     // Only DRAFT
     if (body.status !== 'DRAFT') {
       throw new BadRequestException(
         'Ride status must be DRAFT when saving draft',
       );
     }
   

     if (body.id && body.id !== rideId) {
       throw new BadRequestException('Ride ID mismatch');
     }
   
     // routeGeoJson is required
     if (!payload.routeGeoJson) {
       throw new BadRequestException('routeGeoJson is required');
     }
   
   
     return this.rideService.saveDraftRide({
       rideId,
       userId,
       payload, 
     });
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

    //  CONFIRMED
    if (body.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Ride must be in CONFIRMED status to confirm',
      );
    }

    //  ID match check
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
    const userId = req.user.id;

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
    const userId = req.user.id;
    return this.rideService.getRideDetail(userId, rideId);
  }

  
  
}