//Project/backend/src/rides/ride.controller.ts
import {
    Body,
    Controller,
    Param,
    Put,
    Req,
    UseGuards,
    Post
  } from '@nestjs/common';

  import { RideService } from './ride.service';
  import { SaveRideSegmentsDto } from './dto/save-ride-segments.dto';
  import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
  
  @Controller('rides')
  export class RideController {
    constructor(private readonly rideService: RideService) {}
  
    /**
     * 保存 Draft Ride Segments + Reports
     */
    @UseGuards(SupabaseAuthGuard)
    @Put(':rideId/segments')
    async saveRideSegments(
      @Param('rideId') rideId: string,
      @Body() dto: SaveRideSegmentsDto,
      @Req() req: any,
    ) {
      const userId = req.user.userId;
  
      return this.rideService.saveDraftSegments(
        rideId,
        userId,
        dto,
      );
    }




    @UseGuards(SupabaseAuthGuard)
    @Post(':rideId/confirm')
    async confirmRide(
    @Param('rideId') rideId: string,
    @Req() req: any,
    ) {
    const userId = req.user.userId; // 或 req.user.id（以 guard 为准）

    return this.rideService.confirmRide(rideId, userId);
    }
  }
  