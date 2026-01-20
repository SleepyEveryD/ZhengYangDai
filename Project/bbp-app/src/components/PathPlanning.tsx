import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ArrowLeftIcon,
  MapPinIcon,
  TargetIcon,
  NavigationIcon,
  LogInIcon,
} from "lucide-react";
import type { User } from "../types/user";

type PathPlanningProps = {
  user?: User;
};

export default function PathPlanning({ user }: PathPlanningProps) {
  const navigate = useNavigate();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  const suggestions = [
    "Beijing Chaoyang District CBD",
    "Beijing Haidian District Zhongguancun",
    "Beijing Dongcheng District Tiananmen",
    "Beijing Xicheng District Xidan",
  ];

const handleSearch = () => {
  if (origin && destination) {
    navigate(
      `/path/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    );
  }
};



  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/map")}
          className="h-10 w-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Plan Route</h2>
      </div>

      {/* Input Fields */}
      <div className="flex-1 p-4 space-y-4">
        {/* Origin */}
        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="mt-3">
              <MapPinIcon className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <label className="text-gray-600 mb-2 block">Start Point</label>
              <Input
                placeholder="Enter start address..."
                value={origin}
                onChange={(e) => {
                  setOrigin(e.target.value);
                  setShowOriginSuggestions(true);
                }}
                onFocus={() => setShowOriginSuggestions(true)}
                className="h-12"
              />
              {showOriginSuggestions && origin && (
                <div className="absolute left-8 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {suggestions
                    .filter((s) => s.includes(origin))
                    .map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setOrigin(suggestion);
                          setShowOriginSuggestions(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="w-4 h-4 text-gray-400" />
                          <span>{suggestion}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Destination */}
        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="mt-3">
              <TargetIcon className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <label className="text-gray-600 mb-2 block">Destination</label>
              <Input
                placeholder="Enter destination address..."
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setShowDestSuggestions(true);
                }}
                onFocus={() => setShowDestSuggestions(true)}
                className="h-12"
              />
              {showDestSuggestions && destination && (
                <div className="absolute left-8 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {suggestions
                    .filter((s) => s.includes(destination))
                    .map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setDestination(suggestion);
                          setShowDestSuggestions(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <TargetIcon className="w-4 h-4 text-gray-400" />
                          <span>{suggestion}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Locations */}
        <div className="pt-4">
          <p className="text-gray-600 mb-3">Quick Locations</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 justify-start"
              onClick={() => setOrigin("Current Location")}
            >
              <NavigationIcon className="w-4 h-4 mr-2" />
              Current Location
            </Button>
            <Button
              variant="outline"
              className="h-12 justify-start"
              onClick={() => setOrigin("Beijing Chaoyang District CBD")}
            >
              <MapPinIcon className="w-4 h-4 mr-2" />
              Office
            </Button>
            <Button
              variant="outline"
              className="h-12 justify-start"
              onClick={() =>
                setDestination("Beijing Haidian District Zhongguancun")
              }
            >
              <MapPinIcon className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button
              variant="outline"
              className="h-12 justify-start"
              onClick={() =>
                setDestination("Beijing Dongcheng District Tiananmen")
              }
            >
              <MapPinIcon className="w-4 h-4 mr-2" />
              Gym
            </Button>
          </div>
        </div>
      </div>

      {/* Search Button */}
      <div className="p-4 border-t space-y-3">
        <Button
          className="w-full h-14 bg-green-600 hover:bg-green-700"
          onClick={handleSearch}
          disabled={!origin || !destination}
        >
          <NavigationIcon className="w-5 h-5 mr-2" />
          Search Route
        </Button>

        {/* Guest Login Prompt */}
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-blue-900 mb-2">
              Login to record rides and report road conditions
            </p>
            <Button
              variant="outline"
              className="w-full h-10 border-blue-600 text-blue-600 hover:bg-blue-50"
              onClick={() => navigate("/login")}
            >
              <LogInIcon className="w-4 h-4 mr-2" />
              Login Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
