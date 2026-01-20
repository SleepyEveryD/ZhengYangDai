//Project/backend/src/rides/ride.controller.ts
import {
    Body,
    Controller,
    Param,
    Put,
    Req,
    Post,
    UseGuards,
  } from '@nestjs/common';
  import { RideService } from './ride.service';
  import { SaveRideSegmentsDto } from './dto/save-ride-segments.dto';
  import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
  
  @Controller('rides')
  export class RideController {
    constructor(private readonly rideService: RideService) {
      console.log('🔥🔥 RideController LOADED 🔥🔥');

    }
  
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
      console.log('[RideController] saveRideSegments called', {
        rideId,
        body: dto,
        user: req.user,
      });
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
      @Body() body: { publish: boolean },
      @Req() req: any,
    ) {
      console.log('[RideController] confirmRide called', {
        rideId,
        body,
        user: req.user,
      });
      const userId = req.user.userId;
      return this.rideService.confirmRide(rideId, userId, body.publish);
    }

  }
  