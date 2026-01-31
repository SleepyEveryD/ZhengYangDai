import { useEffect, useState } from "react";
import type { RideWeather } from "../types/weather";

const API_KEY = import.meta.env.VITE_OPEN_WEATHER_KEY;

type WeatherProps = {
  value?: RideWeather | null;
};

export default function Weather({ value }: WeatherProps) {
  const [weather, setWeather] = useState<RideWeather | null>(value ?? null);
  const [error, setError] = useState<string | null>(null);

  // 同步父组件传入的 value
  useEffect(() => {
    if (value) {
      setWeather(value);
    }
  }, [value]);

  // 自动获取（仅在没有 weather 时）
  useEffect(() => {
    if (weather) return;
    if (!API_KEY) {
      setError("Weather API key missing");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=en&appid=${API_KEY}`
          );
          const data = await res.json();

          setWeather({
            temp: Math.round(data.main.temp),
            condition: data.weather?.[0]?.description,
            wind: formatWind(data.wind.deg, data.wind.speed),
            raw: data,
          });
        } catch {
          setError("Failed to fetch weather");
        }
      },
      () => setError("Location permission denied")
    );
  }, [weather]);

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (!weather) {
    return <div className="text-sm text-gray-400">Loading weather...</div>;
  }

  return (
    <div className="rounded-xl border p-4 bg-white shadow-sm">
      <div className="text-sm text-gray-500 mb-1">Weather</div>

      <div className="text-3xl font-semibold">
        {weather.temp ?? "--"}°C
      </div>

      <div className="text-sm text-gray-600 capitalize">
        {weather.condition ?? "Unknown"}
      </div>

      <div className="text-sm text-gray-600">
        🌬 {weather.wind ?? "-"}
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function formatWind(deg: number, speed: number) {
  const dir = windDegToText(deg);
  return `${dir} · ${speed} m/s`;
}

function windDegToText(deg: number) {
  if (deg >= 337.5 || deg < 22.5) return "N";
  if (deg < 67.5) return "NE";
  if (deg < 112.5) return "E";
  if (deg < 157.5) return "SE";
  if (deg < 202.5) return "S";
  if (deg < 247.5) return "SW";
  if (deg < 292.5) return "W";
  return "NW";
}
