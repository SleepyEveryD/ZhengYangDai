import React, { useEffect, useState } from "react";
import MapView from "./MapView";

export default function MapPage() {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | undefined>(undefined);
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState("准备定位...");

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("浏览器不支持定位");
      return;
    }

    setStatus("正在请求定位权限...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLocation([lat, lng]);
        setStatus(`定位成功：${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      },
      (err) => {
        setStatus(`定位失败：${err.message}（地图将显示默认位置）`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const onSearch = () => {
    if (!destination.trim()) {
      alert("请先输入目的地");
      return;
    }
    alert(
      `起点：${currentLocation ? `${currentLocation[0]}, ${currentLocation[1]}` : "未知（未定位）"}\n目的地：${destination}\n（第一天：先不计算路线）`
    );
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="p-3 border-b">
        <div className="text-sm mb-2">{status}</div>

        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="输入目的地，例如: Milan Central Station"
          />
          <button className="border rounded px-3 py-2" onClick={onSearch}>
            Search
          </button>
        </div>
      </div>

      <div className="flex-1">
        <MapView currentLocation={currentLocation} />
      </div>
    </div>
  );
}
