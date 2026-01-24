import { Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from '../weather/weather.service';

@Controller('weathertest')
export class WeathertestController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  async test(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
  ) {
    if (!lat || !lon) {
      return { message: 'lat and lon are required' };
    }

    return this.weatherService.getWeather(
      Number(lat),
      Number(lon),
    );
  }
}
