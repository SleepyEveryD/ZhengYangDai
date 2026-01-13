import React from 'react';
import { Button } from './ui/button';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, RulerIcon, TrendingUpIcon, ZapIcon, AlertCircleIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import MapView from './MapView';
import { Page, Ride } from '../App';

type RideDetailProps = {
  ride: Ride | null;
  navigateTo: (page: Page) => void;
};

export default function RideDetail({ ride, navigateTo }: RideDetailProps) {
  if (!ride) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Ride record not found</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIssueTypeText = (type: string) => {
    switch (type) {
      case 'pothole':
        return 'Pothole';
      case 'crack':
        return 'Crack';
      case 'obstacle':
        return 'Obstacle';
      default:
        return 'Other';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Severe';
      case 'medium':
        return 'Moderate';
      case 'low':
        return 'Minor';
      default:
        return 'Unknown';
    }
  };

  const calories = Math.round(ride.distance * 30);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateTo('rideHistory')}
          className="h-10 w-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Ride Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-64">
          <MapView
            userPath={ride.path}
            issues={ride.issues.map((issue) => ({
              location: issue.location,
              type: issue.type,
            }))}
          />
        </div>

        <div className="p-4 space-y-6">
          {/* Date & Time */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">{formatDate(ride.date)}</span>
          </div>

          {/* Main Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <RulerIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Total Distance</p>
                    <p className="text-gray-900">{ride.distance} km</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Total Duration</p>
                    <p className="text-gray-900">{formatTime(ride.duration)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <TrendingUpIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Avg Speed</p>
                    <p className="text-gray-900">{ride.avgSpeed} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <ZapIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Max Speed</p>
                    <p className="text-gray-900">{ride.maxSpeed} km/h</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Stats */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-gray-900 mb-4">Other Data</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 mb-1">Calories Burned</p>
                  <p className="text-gray-900">{calories} kcal</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Reported Issues</p>
                  <p className="text-gray-900">{ride.issues.length} items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {ride.issues.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircleIcon className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">
                  Reported Road Issues ({ride.issues.length})
                </span>
              </div>
              <div className="space-y-3">
                {ride.issues.map((issue) => (
                  <Card key={issue.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-900">
                              {getIssueTypeText(issue.type)}
                            </span>
                            <Badge className={getSeverityColor(issue.severity)} variant="secondary">
                              {getSeverityText(issue.severity)}
                            </Badge>
                          </div>
                          <p className="text-gray-600">
                            Location: {issue.location[0].toFixed(4)}, {issue.location[1].toFixed(4)}
                          </p>
                        </div>
                        {issue.autoDetected && (
                          <Badge variant="outline">Auto-detected</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-gray-500">Status</span>
                        <Badge className="bg-green-100 text-green-800">
                          {issue.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}