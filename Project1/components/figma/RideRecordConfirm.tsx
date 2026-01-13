import React, { useState } from 'react';
import { Button } from './ui/button';
import { ArrowLeftIcon, CheckCircleIcon, XIcon, SaveIcon, ShareIcon, AlertCircleIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import MapView from './MapView';
import { Page, Ride, User } from '../App';
import { toast } from 'sonner@2.0.3';

type RideRecordConfirmProps = {
  ride: Ride | null;
  navigateTo: (page: Page) => void;
  user: User;
  setUser: (user: User) => void;
};

export default function RideRecordConfirm({ ride, navigateTo, user, setUser }: RideRecordConfirmProps) {
  const [issues, setIssues] = useState(ride?.issues || []);
  const [showUnconfirmedWarning, setShowUnconfirmedWarning] = useState(false);

  if (!ride) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Ride record not found</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min${secs}sec`;
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

  const handleConfirmIssue = (issueId: string) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId ? { ...issue, status: 'confirmed' as const } : issue
      )
    );
  };

  const handleIgnoreIssue = (issueId: string) => {
    setIssues((prev) => prev.filter((issue) => issue.id !== issueId));
  };

  const handleSaveOnly = () => {
    if (issues.some((issue) => issue.status === 'pending')) {
      setShowUnconfirmedWarning(true);
      return;
    }

    // Update user stats
    if (user) {
      setUser({
        ...user,
        totalDistance: user.totalDistance + ride.distance,
        totalRides: user.totalRides + 1,
      });
    }

    toast.success('Ride data saved');
    navigateTo('map');
  };

  const handleSaveAndPublish = () => {
    if (issues.some((issue) => issue.status === 'pending')) {
      setShowUnconfirmedWarning(true);
      return;
    }

    const confirmedIssues = issues.filter((issue) => issue.status === 'confirmed');

    // Update user stats
    if (user) {
      setUser({
        ...user,
        totalDistance: user.totalDistance + ride.distance,
        totalRides: user.totalRides + 1,
        totalReports: user.totalReports + confirmedIssues.length,
      });
    }

    toast.success(`Published ride data and ${confirmedIssues.length} road reports`);
    navigateTo('map');
  };

  const pendingIssues = issues.filter((issue) => issue.status === 'pending');
  const confirmedIssues = issues.filter((issue) => issue.status === 'confirmed');

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateTo('map')}
          className="h-10 w-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Confirm Ride Data</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-64">
          <MapView
            userPath={ride.path}
            issues={issues.map((issue) => ({
              location: issue.location,
              type: issue.type,
            }))}
          />
        </div>

        <div className="p-4 space-y-6">
          {/* Ride Stats */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-gray-900 mb-4">Ride Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 mb-1">Total Distance</p>
                  <p className="text-gray-900">{ride.distance} km</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Total Duration</p>
                  <p className="text-gray-900">{formatTime(ride.duration)}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Avg Speed</p>
                  <p className="text-gray-900">{ride.avgSpeed} km/h</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Max Speed</p>
                  <p className="text-gray-900">{ride.maxSpeed} km/h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detected Issues */}
          {issues.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900">
                  Detected Issues ({issues.length})
                </h3>
                {pendingIssues.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-800">
                    {pendingIssues.length} pending
                  </Badge>
                )}
              </div>

              {showUnconfirmedWarning && pendingIssues.length > 0 && (
                <Card className="bg-orange-50 border-orange-200 mb-3">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircleIcon className="w-5 h-5 text-orange-600 mt-0.5" />
                      <p className="text-orange-900">
                        {pendingIssues.length} issues pending confirmation, please review before saving.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {issues.map((issue) => (
                  <Card key={issue.id} className={issue.status === 'pending' ? 'border-orange-300' : ''}>
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
                            {issue.autoDetected && (
                              <Badge variant="outline">Auto-detected</Badge>
                            )}
                          </div>
                          <p className="text-gray-600">
                            Location: {issue.location[0].toFixed(4)}, {issue.location[1].toFixed(4)}
                          </p>
                        </div>
                        {issue.status === 'confirmed' && (
                          <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        )}
                      </div>

                      {issue.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            className="flex-1 h-10"
                            onClick={() => handleIgnoreIssue(issue.id)}
                          >
                            <XIcon className="w-4 h-4 mr-2" />
                            Ignore
                          </Button>
                          <Button
                            className="flex-1 h-10 bg-orange-600 hover:bg-orange-700"
                            onClick={() => handleConfirmIssue(issue.id)}
                          >
                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                            Confirm Report
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {issues.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-gray-600">No road issues detected on this ride</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t bg-white space-y-3">
        <Button
          variant="outline"
          className="w-full h-12"
          onClick={handleSaveOnly}
        >
          <SaveIcon className="w-5 h-5 mr-2" />
          Save to Personal Record Only
        </Button>
        <Button
          className="w-full h-12 bg-green-600 hover:bg-green-700"
          onClick={handleSaveAndPublish}
        >
          <ShareIcon className="w-5 h-5 mr-2" />
          Save and Publish to Community
          {confirmedIssues.length > 0 && ` (${confirmedIssues.length} reports)`}
        </Button>
      </div>
    </div>
  );
}