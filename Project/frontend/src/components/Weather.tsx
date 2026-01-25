// @ts-nocheck
import { useEffect, useState } from "react";

const API_KEY = import.meta.env.VITE_OPEN_WEATHER_KEY;

export default function WeatherWidget() {
  const [autoWeather, setAutoWeather] = useState<any>(null);
  const [customWeather, setCustomWeather] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=en&appid=${API_KEY}`
          );
          const data = await res.json();

          setAutoWeather({
            city: data.name,
            temp: Math.round(data.main.temp),
            condition: data.weather[0].description,
            wind: formatWind(data.wind.deg, data.wind.speed),
          });
        } catch {
          setError("Failed to load weather");
        }
      },
      () => {
        setError("Location permission denied");
      }
    );
  }, []);

  const displayWeather = customWeather ?? autoWeather;

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (!displayWeather) {
    return <div className="text-sm text-gray-400">Loading weather...</div>;
  }

  return (
    <div className="rounded-xl border p-4 bg-white shadow-sm">
      {!editing ? (
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-500">
              📍 {displayWeather.city}
            </div>

            <div className="mt-1 text-3xl font-semibold">
              {displayWeather.temp}°C
            </div>

            <div className="text-sm text-gray-600 capitalize">
              {displayWeather.condition}
            </div>

            <div className="text-sm text-gray-600">
              🌬 {displayWeather.wind}
            </div>
          </div>

          <button
            className="text-sm text-blue-500 hover:underline"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="City"
            value={customWeather?.city ?? displayWeather.city}
            onChange={(e) =>
              setCustomWeather({
                ...displayWeather,
                city: e.target.value,
              })
            }
          />

          <input
            type="number"
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Temperature (°C)"
            value={customWeather?.temp ?? displayWeather.temp}
            onChange={(e) =>
              setCustomWeather({
                ...displayWeather,
                temp: Number(e.target.value),
              })
            }
          />

          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Weather (e.g. Clear, Cloudy)"
            value={customWeather?.condition ?? displayWeather.condition}
            onChange={(e) =>
              setCustomWeather({
                ...displayWeather,
                condition: e.target.value,
              })
            }
          />

          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="Wind (e.g. North Wind · 2.1 m/s)"
            value={customWeather?.wind ?? displayWeather.wind}
            onChange={(e) =>
              setCustomWeather({
                ...displayWeather,
                wind: e.target.value,
              })
            }
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="text-sm text-gray-500 hover:underline"
              onClick={() => {
                setCustomWeather(null);
                setEditing(false);
              }}
            >
              Cancel
            </button>

            <button
              className="text-sm text-blue-500 hover:underline"
              onClick={() => setEditing(false)}
            >
              Save
            </button>
          </div>
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
