import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ArrowLeftIcon, MapPinIcon, TargetIcon, NavigationIcon } from "lucide-react";
import type { User } from "../types/user";

type PathPlanningProps = { user?: User };

export default function PathPlanning({ user }: PathPlanningProps) {
  const navigate = useNavigate();

  const [origin, setOrigin] = useState("");              // 文本（可选）
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null); // 坐标（关键）
  const [destination, setDestination] = useState("");

  // ✅ 页面加载就定位到用户（米兰）
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginCoords([pos.coords.latitude, pos.coords.longitude]);
        setOrigin("Current Location");
      },
      (err) => {
        console.warn("geolocation error", err);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const handleSearch = () => {
    if (!destination) return;

    navigate("/path/results", {
      state: {
        originText: origin,          // 如果你想支持用户自己输入起点
        originCoords: originCoords,               // ✅ 有坐标就优先用坐标
        destinationText: destination, // 例如 "Milano Centrale"
      },
    });
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate("/map")} className="h-10 w-10">
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Plan Route</h2>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-3"><MapPinIcon className="w-5 h-5 text-green-600" /></div>
          <div className="flex-1">
            <label className="text-gray-600 mb-2 block">Start Point</label>
            <Input
              placeholder="Enter start address..."
              value={origin}
              onChange={(e) => {
                setOrigin(e.target.value);
                // 用户手输起点时，坐标清掉（让 results 用 originText 去算）
                setOriginCoords(null);
              }}
              className="h-12"
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-3"><TargetIcon className="w-5 h-5 text-red-600" /></div>
          <div className="flex-1">
            <label className="text-gray-600 mb-2 block">Destination</label>
            <Input
              placeholder="Enter destination address..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-12"
            />
          </div>
        </div>
      </div>

      <div className="p-4 border-t">
        <Button
          className="w-full h-14 bg-green-600 hover:bg-green-700"
          onClick={handleSearch}
          disabled={!destination}
        >
          <NavigationIcon className="w-5 h-5 mr-2" />
          Search Route
        </Button>
      </div>
    </div>
  );
}
