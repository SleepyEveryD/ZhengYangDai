import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  ArrowLeftIcon,
  CircleDotIcon,
  MapIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useAuth } from '../auth/AuthContext';
import { saveRideLocal } from '../services/rideStorage';



export default function RideRecordPrepare() {
  const navigate = useNavigate();
  const user = useAuth(); 


  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/map")}
          className="h-10 w-10 bg-white"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Prepare Recording</h2>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        <div className="w-32 h-32 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
          <CircleDotIcon className="w-16 h-16 text-white" />
        </div>

        <div className="text-center">
          <h2 className="text-gray-900 mb-2">Ready to Start Riding</h2>
          <p className="text-gray-600">
            We will record your ride track and road conditions
          </p>
        </div>

        {/* Info Cards */}
        <div className="w-full max-w-md space-y-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapIcon className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-gray-900 mb-1">GPS Tracking</p>
                  <p className="text-gray-600">
                    Real-time recording of your ride route and location
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

   
        </div>

        {/* Permission Notice */}
        <div className="w-full max-w-md">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-blue-900">
                <strong>Note:</strong> Please ensure GPS location and sensor
                permissions are granted for the best recording experience.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Start Button */}
      <div className="p-4">
        <Button
          className="w-full h-16 bg-green-600 hover:bg-green-700 shadow-lg"
          onClick={() => {
            const now = new Date();

            const ride = {
              id: crypto.randomUUID(),
              userId: user.id, // ⬅️ 本地模式 / 未登录可用
              startedAt: now,
              endedAt: null,
              routeGeoJson: null,
            };
            console.log("RideRecordPrepare.tsx>> now is at" + now);
            
            saveRideLocal(ride);
            navigate("/ride/recording");
          }}
        >
          <CircleDotIcon className="w-6 h-6 mr-2" />
          Start Riding
        </Button>
      </div>



    </div>
  );
}