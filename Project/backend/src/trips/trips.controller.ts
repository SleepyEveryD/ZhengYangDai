import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { TripsService } from "./trips.service";
import { StartTripDto } from "./dto/start-trip.dto";
import { StopTripDto } from "./dto/stop-trip.dto";

@Controller("trips")
export class TripsController {
  constructor(private tripsService: TripsService) {}

  @Post("start")
  async start(@Body() dto: StartTripDto) {
    const trip = await this.tripsService.startTrip(dto);
    return { trip };
  }

  @Post("stop")
  async stop(@Body() dto: StopTripDto) {
    const trip = await this.tripsService.stopTrip(dto);
    return { trip };
  }

  @Get("history")
  async history(@Query("userId") userId: string) {
    const trips = await this.tripsService.getTripHistory(userId);
    return { trips };
  }
}
