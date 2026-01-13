import React from 'react';
import { Button } from './ui/button';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, RulerIcon, TrendingUpIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Page, Ride } from '../App';

type RideHistoryProps = {
  navigateTo: (page: Page, data?: any) => void;
};

const mockRides: Ride[] = [
  {
    id: '1',
    date: '2025-11-07',
    distance: 8.5,
    duration: 1800,
    avgSpeed: 17.0,
    maxSpeed: 28.5,
    path: [
      [39.9042, 116.4074],
      [39.9142, 116.4174],
      [39.9242, 116.4274],
    ],
    issues: [
      {
        id: 'i1',
        type: 'pothole',
        location: [39.9142, 116.4174],
        severity: 'medium',
        status: 'confirmed',
        date: '2025-11-07',
        autoDetected: true,
      },
    ],
  },
  {
    id: '2',
    date: '2025-11-06',
    distance: 12.3,
    duration: 2520,
    avgSpeed: 17.5,
    maxSpeed: 32.0,
    path: [
      [39.9042, 116.4074],
      [39.9242, 116.4274],
    ],
    issues: [],
  },
  {
    id: '3',
    date: '2025-11-05',
    distance: 6.8,
    duration: 1440,
    avgSpeed: 17.0,
    maxSpeed: 26.0,
    path: [
      [39.9042, 116.4074],
      [39.9142, 116.4174],
    ],
    issues: [
      {
        id: 'i2',
        type: 'crack',
        location: [39.9142, 116.4174],
        severity: 'low',
        status: 'confirmed',
        date: '2025-11-05',
        autoDetected: true,
      },
      {
        id: 'i3',
        type: 'obstacle',
        location: [39.9042, 116.4074],
        severity: 'high',
        status: 'confirmed',
        date: '2025-11-05',
        autoDetected: false,
      },
    ],
  },
];

export default function RideHistory({ navigateTo }: RideHistoryProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}hr ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const totalDistance = mockRides.reduce((sum, ride) => sum + ride.distance, 0);
  const totalTime = mockRides.reduce((sum, ride) => sum + ride.duration, 0);
  const totalIssues = mockRides.reduce((sum, ride) => sum + ride.issues.length, 0);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateTo('profile')}
          className="h-10 w-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-gray-900">My Rides</h2>
          <p className="text-gray-500">{mockRides.length} rides</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Summary Stats */}
        <div className="bg-white p-4 border-b">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-gray-900 mb-1">{totalDistance.toFixed(1)} km</p>
              <p className="text-gray-600">Total Distance</p>
            </div>
            <div>
              <p className="text-gray-900 mb-1">{formatTime(totalTime)}</p>
              <p className="text-gray-600">Total Duration</p>
            </div>
            <div>
              <p className="text-gray-900 mb-1">{totalIssues}</p>
              <p className="text-gray-600">Reported Issues</p>
            </div>
          </div>
        </div>

        {/* Ride List */}
        <div className="p-4 space-y-3">
          {mockRides.map((ride) => (
            <Card
              key={ride.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigateTo('rideDetail', ride)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{formatDate(ride.date)}</span>
                  </div>
                  {ride.issues.length > 0 && (
                    <Badge className="bg-orange-100 text-orange-800">
                      {ride.issues.length} issues
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <RulerIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{ride.distance} km</span>
                    </div>
                    <p className="text-gray-500">Distance</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{formatTime(ride.duration)}</span>
                    </div>
                    <p className="text-gray-500">Duration</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUpIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{ride.avgSpeed} km/h</span>
                    </div>
                    <p className="text-gray-500">Avg Speed</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Click to view details</span>
                  <ArrowLeftIcon className="w-4 h-4 text-gray-400 transform rotate-180" />
                </div>
              </CardContent>
            </Card>
          ))}

          {mockRides.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">No ride records yet</p>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => navigateTo('rideRecordPrepare')}
                >
                  Start Your First Ride
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}