import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WeatherService {
    
  async getWeather(lat: number, lon: number) {
    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          lat,
          lon,
          appid: process.env.WEATHER_API_KEY,
          units: 'metric',
        },
      },
    );

    const data = response.data;

    return {
      weather: data.weather[0].main,      // 天气
      temperature: data.main.temp,        // 温度
      windDirection: this.toWindDir(data.wind.deg), // 风向
    };
  }

  private toWindDir(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  }
}
