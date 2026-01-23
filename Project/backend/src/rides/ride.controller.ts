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
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('rides')
export class RideController {
  constructor(private readonly rideService: RideService) {
    console.log('🔥🔥 RideController LOADED 🔥🔥');
  }

  /**
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

    return this.rideService.saveDraftRide(
      rideId,
      userId,
      body, // routeGeoJson
    );
  }

  /**
   * Confirm Ride（生成 Street + RideStreet）
   */
  @UseGuards(SupabaseAuthGuard)
  @Post(':rideId/confirm')
  async confirmRide(
    @Param('rideId') rideId: string,
    @Body() body: { publish: boolean },
    @Req() req: any,
  ) {
    const userId = req.user.userId;

    return this.rideService.confirmRide(
      rideId,
      userId,
      body.publish,
    );
  }
}
