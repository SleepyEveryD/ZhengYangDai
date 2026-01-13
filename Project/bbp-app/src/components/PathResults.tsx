import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  ArrowLeftIcon,
  StarIcon,
  ClockIcon,
  RulerIcon,
  TrendingUpIcon,
  LogInIcon,
} from "lucide-react";
import { Badge } from "./ui/badge";
import MapView from "./MapView";
import { motion } from "motion/react";
import type { Route } from "../types/route";
import type { User } from "../types/user";

type PathResultsProps = {
  user?: User;
};

const mockRoutes: Route[] = [
  {
    id: "1",
    name: "Recommended Route",
    distance: 5.2,
    duration: 18,
    rating: 4.5,
    condition: "excellent",
    path: [
      [39.9042, 116.4074],
      [39.9142, 116.4174],
      [39.9242, 116.4274],
    ],
    elevation: [0, 5, 10, 8, 15, 12, 18, 20, 22, 25],
    segments: [
      {
        condition: "excellent",
        distance: 3.5,
        description: "Dedicated bike lane, smooth surface",
      },
      {
        condition: "good",
        distance: 1.7,
        description: "Shared lane, light traffic",
      },
    ],
    comments: [
      {
        user: "Li Ming",
        date: "2025-11-05",
        content: "Great road condition, recommended!",
        rating: 5,
      },
    ],
  },
  {
    id: "2",
    name: "Shortest Route",
    distance: 4.8,
    duration: 16,
    rating: 3.5,
    condition: "fair",
    path: [
      [39.9042, 116.4074],
      [39.9042, 116.4274],
      [39.9242, 116.4274],
    ],
    elevation: [0, 8, 15, 12, 20, 18, 25, 22, 28, 30],
    segments: [
      {
        condition: "good",
        distance: 2.5,
        description: "City road, moderate traffic",
      },
      {
        condition: "fair",
        distance: 2.3,
        description: "Minor pavement damage",
      },
    ],
    comments: [],
  },
  {
    id: "3",
    name: "Scenic Route",
    distance: 6.5,
    duration: 23,
    rating: 4.0,
    condition: "good",
    path: [
      [39.9042, 116.4074],
      [39.8942, 116.4174],
      [39.9042, 116.4274],
      [39.9242, 116.4274],
    ],
    elevation: [0, 3, 5, 8, 6, 10, 12, 15, 18, 20],
    segments: [
      {
        condition: "excellent",
        distance: 4.0,
        description: "Riverside bike path, beautiful scenery",
      },
      {
        condition: "good",
        distance: 2.5,
        description: "Park interior road",
      },
    ],
    comments: [
      {
        user: "Wang Fang",
        date: "2025-11-03",
        content: "Nice scenery, suitable for leisure cycling",
        rating: 4,
      },
    ],
  },
];

export default function PathResults({ user }: PathResultsProps) {
  const navigate = useNavigate();
  const [selectedRouteId, setSelectedRouteId] = useState("1");
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const selectedRoute = mockRoutes.find((r) => r.id === selectedRouteId);

  const getConditionColor = (condition: Route["condition"]) => {
    switch (condition) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "fair":
        return "bg-yellow-100 text-yellow-800";
      case "poor":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConditionText = (condition: Route["condition"]) => {
    switch (condition) {
      case "excellent":
        return "Excellent";
      case "good":
        return "Good";
      case "fair":
        return "Fair";
      case "poor":
        return "Poor";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/path/planning")}
          className="h-10 w-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-gray-900">Route Results</h2>
          <p className="text-gray-500">
            Found {mockRoutes.length} routes
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="h-64 relative">
        <MapView
          highlightedPaths={
            selectedRoute
              ? [
                  {
                    id: selectedRoute.id,
                    coordinates: selectedRoute.path,
                    condition: selectedRoute.condition,
                  },
                ]
              : []
          }
        />
        {isAnimating && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-3"
              />
              <p className="text-gray-600">
                Calculating best route...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Route List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {mockRoutes.map((route, index) => (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 1.5 }}
            >
              <div
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedRouteId === route.id
                    ? "border-green-600 bg-green-50 shadow-md"
                    : "border-gray-200 hover:border-green-300"
                }`}
                onClick={() => setSelectedRouteId(route.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-900">{route.name}</span>
                      {index === 0 && (
                        <Badge className="bg-green-600">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-600">
                        {route.rating}
                      </span>
                    </div>
                  </div>
                  <Badge className={getConditionColor(route.condition)}>
                    {getConditionText(route.condition)}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <RulerIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-900">
                        {route.distance} km
                      </p>
                      <p className="text-gray-500">Distance</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-900">
                        {route.duration} min
                      </p>
                      <p className="text-gray-500">Duration</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUpIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-900">
                        {route.segments.length} seg
                      </p>
                      <p className="text-gray-500">Segments</p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/path/${route.id}`);
                  }}
                >
                  View Details
                </Button>
              </div>
            </motion.div>
          ))}

          {/* Guest Login Prompt */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <p className="text-blue-900 mb-3 text-center">
                <strong>
                  Login to record rides and report road conditions
                </strong>
              </p>
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate("/login")}
              >
                <LogInIcon className="w-5 h-5 mr-2" />
                Login Now
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
