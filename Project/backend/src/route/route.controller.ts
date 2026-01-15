import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { RouteService } from './route.service';

@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get('search')
  async search(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
  ) {
    if (!origin || !destination) {
      throw new BadRequestException(
        'origin and destination are required, format: lat,lng',
      );
    }

    return this.routeService.searchRoutes(origin, destination);
  }
}
