import { useEffect, useState } from "react";
const API_KEY = import.meta.env.VITE_OPEN_WEATHER_KEY;

type WeatherWidgetProps = {
  value?: RideWeather | null;
  onChange?: (weather: RideWeather) => void;
};

export default function WeatherWidget({ value, onChange }: WeatherWidgetProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 本地仅用于“自动获取”
  useEffect(() => {
    if (value) return; // 父组件已经有数据，不自动覆盖

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=en&appid=${API_KEY}`
        );
        const data = await res.json();

        const auto: RideWeather = {
          temp: Math.round(data.main.temp),
          condition: data.weather[0].description,
          wind: formatWind(data.wind.deg, data.wind.speed),
          raw: data,
        };

        onChange?.(auto);
      },
      () => setError("Location permission denied")
    );
  }, [value, onChange]);

  const display = value;

  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (!display) return <div className="text-sm text-gray-400">Loading weather...</div>;

  return (
    <div className="rounded-xl border p-4 bg-white shadow-sm">
      {!editing ? (
        <div className="flex justify-between items-start">
          <div>
            <div className="mt-1 text-3xl font-semibold">
              {display.temp}°C
            </div>
            <div className="text-sm text-gray-600 capitalize">
              {display.condition}
            </div>
            <div className="text-sm text-gray-600">
              🌬 {display.wind}
            </div>
          </div>

          <button onClick={() => setEditing(true)}>Edit</button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={display.temp ?? ""}
            type="number"
            onChange={(e) =>
              onChange?.({ ...display, temp: Number(e.target.value) })
            }
          />
          <input
            value={display.condition ?? ""}
            onChange={(e) =>
              onChange?.({ ...display, condition: e.target.value })
            }
          />
          <input
            value={display.wind ?? ""}
            onChange={(e) =>
              onChange?.({ ...display, wind: e.target.value })
            }
          />

          <button onClick={() => setEditing(false)}>Save</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function formatWind(deg: number, speed: number) {
  const dir = windDegToText(deg);
  return `${dir} · ${speed} m/s`;
}

function windDegToText(deg: number) {
  if (deg >= 337.5 || deg < 22.5) return "North Wind";
  if (deg < 67.5) return "North-East Wind";
  if (deg < 112.5) return "East Wind";
  if (deg < 157.5) return "South-East Wind";
  if (deg < 202.5) return "South Wind";
  if (deg < 247.5) return "South-West Wind";
  if (deg < 292.5) return "West Wind";
  return "North-West Wind";
}
