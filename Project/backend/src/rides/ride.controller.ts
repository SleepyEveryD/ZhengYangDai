import {
    Body,
    Controller,
    Param,
    Put,
    Req,
    UseGuards,
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
  }
  