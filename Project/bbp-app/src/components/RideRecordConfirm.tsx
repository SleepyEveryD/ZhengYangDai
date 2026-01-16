import React, { useState } from 'react';
import { Button } from './ui/button';
import { ArrowLeftIcon, CheckCircleIcon, XIcon, SaveIcon, ShareIcon, AlertCircleIcon, MapPinIcon, PlusIcon, EditIcon, TrashIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import MapView from './MapView';
import type { Ride } from '../types/ride';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useNavigate,useLocation } from 'react-router-dom';
import type { User } from "../types/user";
import { saveRideLocal } from '../services/rideStorage';



type RideRecordConfirmProps = {
  user: User;
  setUser: (user: User) => void;
};


type RoadConditionSegment = {
  id: string;
  startPoint: number;
  endPoint: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  pathCoordinates: [number, number][];
};

export default function RideRecordConfirm({ user, setUser }: RideRecordConfirmProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const ride: Ride | null = location.state?.ride ?? null;

  if (!ride) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Ride record not found</p>
      </div>
    );
  }

  const [issues, setIssues] = useState(ride?.issues || []);
  const [showUnconfirmedWarning, setShowUnconfirmedWarning] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportTab, setReportTab] = useState<'issues' | 'conditions'>('issues');
  const [roadConditionSegments, setRoadConditionSegments] = useState<RoadConditionSegment[]>([]);

  
  // New issue reporting state
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [selectedIssueLocation, setSelectedIssueLocation] = useState<[number, number] | null>(null);
  const [newIssueType, setNewIssueType] = useState<'pothole' | 'crack' | 'obstacle'>('pothole');
  const [newIssueSeverity, setNewIssueSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  
  // Segment selection state
  const [isSelectingSegment, setIsSelectingSegment] = useState(false);
  const [segmentStartPoint, setSegmentStartPoint] = useState<number | null>(null);
  const [segmentEndPoint, setSegmentEndPoint] = useState<number | null>(null);
  const [segmentCondition, setSegmentCondition] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  
  // Current step in the workflow
  const [currentStep, setCurrentStep] = useState<'stats' | 'report' | 'review'>('stats');

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
    if (issues.some(issue => issue.status === 'pending')) {
      toast.error('Please confirm or ignore all pending issues');
      return;
    }
    if (roadConditionSegments.length === 0) {
      toast.error('Please add at least one road condition segment');
      setShowReportDialog(true);
      setReportTab('conditions');
      return;
    }
    
    const finalRide = {
      ...ride,
      issues,
      uploadStatus: 'pending', // 👈 关键
      confirmedAt: new Date().toISOString(),
    };
  
    saveRideLocal(finalRide);
  
    toast.success('Ride saved locally');
    navigate('/map');
  };
  

  const handleSaveAndPublish = () => {
    if (issues.some(issue => issue.status === 'pending')) {
      toast.error('Please confirm or ignore all pending issues');
      return;
    }
    if (roadConditionSegments.length === 0) {
      toast.error('Please add at least one road condition segment before publishing');
      setShowReportDialog(true);
      setReportTab('conditions');
      return;
    }
    
  
    const confirmedIssues = issues.filter(i => i.status === 'confirmed');
  
    const finalRide = {
      ...ride,
      issues,
      uploadStatus: 'pending',
      publish: true,
      confirmedAt: new Date().toISOString(),
    };
  
    saveRideLocal(finalRide);
  
    toast.success(`Saved & queued ${confirmedIssues.length} reports`);
    navigate('/map');
  };
  

  const pendingIssues = issues.filter((issue) => issue.status === 'pending');
  const confirmedIssues = issues.filter((issue) => issue.status === 'confirmed');

  // Add new manual issue
  const handleAddManualIssue = () => {
    if (!selectedIssueLocation) {
      toast.error('Please select a location on the map');
      return;
    }

    const newIssue = {
      id: `manual-issue-${Date.now()}`,
      type: newIssueType,
      location: selectedIssueLocation,
      severity: newIssueSeverity,
      status: 'confirmed' as const,
      date: new Date().toISOString(),
      description: newIssueDescription,
      autoDetected: false,
    };

    setIssues((prev) => [...prev, newIssue]);
    setSelectedIssueLocation(null);
    setNewIssueDescription('');
    setIsAddingIssue(false);
    toast.success('Issue added successfully');
  };

  // Edit existing issue
  const handleEditIssue = (issueId: string) => {
    const issue = issues.find((i) => i.id === issueId);
    if (issue) {
      setEditingIssueId(issueId);
      setSelectedIssueLocation(issue.location);
      setNewIssueType(issue.type);
      setNewIssueSeverity(issue.severity);
      setNewIssueDescription(issue.description || '');
      setIsAddingIssue(true);
      setReportTab('issues');
      setShowReportDialog(true);
    }
  };

  const handleUpdateIssue = () => {
    if (!editingIssueId || !selectedIssueLocation) return;

    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === editingIssueId
          ? {
              ...issue,
              type: newIssueType,
              location: selectedIssueLocation,
              severity: newIssueSeverity,
              description: newIssueDescription,
            }
          : issue
      )
    );

    setEditingIssueId(null);
    setSelectedIssueLocation(null);
    setNewIssueDescription('');
    setIsAddingIssue(false);
    toast.success('Issue updated successfully');
  };

  const handleDeleteIssue = (issueId: string) => {
    setIssues((prev) => prev.filter((issue) => issue.id !== issueId));
    toast.success('Issue deleted');
  };

  // Add road condition segment
  const handleAddSegment = () => {
    if (segmentStartPoint === null || segmentEndPoint === null) {
      toast.error('Please select start and end points on the route');
      return;
    }

    if (segmentStartPoint >= segmentEndPoint) {
      toast.error('End point must be after start point');
      return;
    }

    const segmentPath = ride.path.slice(segmentStartPoint, segmentEndPoint + 1);

    const newSegment: RoadConditionSegment = {
      id: `segment-${Date.now()}`,
      startPoint: segmentStartPoint,
      endPoint: segmentEndPoint,
      condition: segmentCondition,
      pathCoordinates: segmentPath,
    };

    setRoadConditionSegments((prev) => [...prev, newSegment]);
    setSegmentStartPoint(null);
    setSegmentEndPoint(null);
    setIsSelectingSegment(false);
    toast.success('Road condition segment added');
  };

  const handleEditSegment = (segmentId: string) => {
    const segment = roadConditionSegments.find((s) => s.id === segmentId);
    if (segment) {
      setEditingSegmentId(segmentId);
      setSegmentStartPoint(segment.startPoint);
      setSegmentEndPoint(segment.endPoint);
      setSegmentCondition(segment.condition);
      setIsSelectingSegment(true);
      setReportTab('conditions');
      setShowReportDialog(true);
    }
  };

  const handleUpdateSegment = () => {
    if (!editingSegmentId || segmentStartPoint === null || segmentEndPoint === null) return;

    const segmentPath = ride.path.slice(segmentStartPoint, segmentEndPoint + 1);

    setRoadConditionSegments((prev) =>
      prev.map((segment) =>
        segment.id === editingSegmentId
          ? {
              ...segment,
              startPoint: segmentStartPoint,
              endPoint: segmentEndPoint,
              condition: segmentCondition,
              pathCoordinates: segmentPath,
            }
          : segment
      )
    );

    setEditingSegmentId(null);
    setSegmentStartPoint(null);
    setSegmentEndPoint(null);
    setIsSelectingSegment(false);
    toast.success('Segment updated successfully');
  };

  const handleDeleteSegment = (segmentId: string) => {
    setRoadConditionSegments((prev) => prev.filter((segment) => segment.id !== segmentId));
    toast.success('Segment deleted');
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Needs Repair';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/map')}
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

          {/* Report Road Conditions Button */}
          <Card className="bg-orange-50 border-2 border-orange-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircleIcon className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-orange-900 font-medium mb-1">Required: Report Road Conditions</p>
                  <p className="text-orange-800 text-sm">
                    You must add at least one road condition segment before saving your ride data.
                  </p>
                </div>
              </div>
              <Button
                className="w-full h-12 bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  setShowReportDialog(true);
                  setReportTab('conditions');
                }}
              >
                <MapPinIcon className="w-5 h-5 mr-2" />
                {roadConditionSegments.length === 0 ? 'Add Road Conditions (Required)' : 'Edit Road Conditions'}
              </Button>
            </CardContent>
          </Card>

          {/* Road Condition Segments Preview */}
          {roadConditionSegments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900">
                  Road Condition Segments ({roadConditionSegments.length})
                </h3>
              </div>
              <div className="space-y-3">
                {roadConditionSegments.map((segment) => (
                  <Card key={segment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-900">
                              Segment {segment.startPoint} → {segment.endPoint}
                            </span>
                            <Badge className={getConditionColor(segment.condition)} variant="secondary">
                              {getConditionText(segment.condition)}
                            </Badge>
                          </div>
                          <p className="text-gray-600">
                            {segment.pathCoordinates.length} points ({(segment.pathCoordinates.length * 0.05).toFixed(2)} km approx)
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditSegment(segment.id)}
                          >
                            <EditIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteSegment(segment.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
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
          Save as Draft
        </Button>
        <Button
          className="w-full h-12 bg-green-600 hover:bg-green-700"
          onClick={handleSaveAndPublish}
        >
          <ShareIcon className="w-5 h-5 mr-2" />
          Save and Publish
          {confirmedIssues.length > 0 && ` (${confirmedIssues.length} reports)`}
        </Button>
      </div>

      {/* Report Road Conditions Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Road Conditions</DialogTitle>
          </DialogHeader>

          <Tabs value={reportTab} onValueChange={(v) => setReportTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="issues">
                Issue Points
                {issues.filter(i => !i.autoDetected).length > 0 && (
                  <span className="ml-2 bg-orange-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {issues.filter(i => !i.autoDetected).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="conditions">
                Road Segments
                {roadConditionSegments.length > 0 && (
                  <span className="ml-2 bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {roadConditionSegments.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="space-y-4 mt-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-blue-900 text-sm">
                    <strong>Tip:</strong> Tap on the map below to place a marker where you encountered an issue. You can add multiple issues along your route.
                  </p>
                </CardContent>
              </Card>

              {/* Simplified Map for Issue Selection */}
              <div className="border rounded-lg overflow-hidden">
                <div className="h-48 bg-gray-100 relative">
                  <MapView userPath={ride.path} issues={issues.map(i => ({ location: i.location, type: i.type }))} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <p className="text-white text-sm bg-black/50 px-3 py-1 rounded">Click map to add issue location</p>
                  </div>
                </div>
              </div>

              {!isAddingIssue && (
                <Button
                  className="w-full h-12 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setIsAddingIssue(true);
                    setEditingIssueId(null);
                    setSelectedIssueLocation(null);
                    setNewIssueDescription('');
                  }}
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Issue Point
                </Button>
              )}

              {isAddingIssue && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-4 border-2 border-green-600 rounded-lg bg-green-50"
                >
                  <h4 className="text-gray-900 font-medium">
                    {editingIssueId ? 'Edit Issue' : 'New Issue'}
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <Label>Issue Type</Label>
                      <Select value={newIssueType} onValueChange={(v: any) => setNewIssueType(v)}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pothole">Pothole</SelectItem>
                          <SelectItem value="crack">Crack</SelectItem>
                          <SelectItem value="obstacle">Obstacle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Severity Level</Label>
                      <Select value={newIssueSeverity} onValueChange={(v: any) => setNewIssueSeverity(v)}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Minor</SelectItem>
                          <SelectItem value="medium">Moderate</SelectItem>
                          <SelectItem value="high">Severe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Location (Tap map to select)</Label>
                      <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                        {selectedIssueLocation
                          ? `${selectedIssueLocation[0].toFixed(4)}, ${selectedIssueLocation[1].toFixed(4)}`
                          : 'Click on the map above to set location'}
                      </div>
                      {!selectedIssueLocation && (
                        <Button
                          variant="outline"
                          className="w-full mt-2 h-10"
                          onClick={() => {
                            // Simulate selecting a random point on the path
                            const randomIndex = Math.floor(Math.random() * ride.path.length);
                            setSelectedIssueLocation(ride.path[randomIndex]);
                          }}
                        >
                          <MapPinIcon className="w-4 h-4 mr-2" />
                          Pick Random Point (Demo)
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label>Description (Optional)</Label>
                      <Textarea
                        placeholder="Describe the issue..."
                        value={newIssueDescription}
                        onChange={(e) => setNewIssueDescription(e.target.value)}
                        className="min-h-20"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => {
                          setIsAddingIssue(false);
                          setEditingIssueId(null);
                          setSelectedIssueLocation(null);
                          setNewIssueDescription('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 h-12 bg-orange-600 hover:bg-orange-700"
                        onClick={editingIssueId ? handleUpdateIssue : handleAddManualIssue}
                      >
                        {editingIssueId ? 'Update' : 'Add'} Issue
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* List of Manual Issues */}
              {issues.filter(i => !i.autoDetected).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-gray-900 font-medium">Manual Issues ({issues.filter(i => !i.autoDetected).length})</h4>
                  {issues.filter(i => !i.autoDetected).map((issue) => (
                    <Card key={issue.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{getIssueTypeText(issue.type)}</span>
                              <Badge className={getSeverityColor(issue.severity)} variant="secondary">
                                {getSeverityText(issue.severity)}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600">
                              {issue.location[0].toFixed(4)}, {issue.location[1].toFixed(4)}
                            </p>
                            {issue.description && (
                              <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditIssue(issue.id)}
                            >
                              <EditIcon className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => handleDeleteIssue(issue.id)}
                            >
                              <TrashIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4 mt-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-blue-900 text-sm">
                    <strong>Tip:</strong> Select a segment of your route to rate its road condition. You can add multiple segments with different ratings.
                  </p>
                </CardContent>
              </Card>

              {/* Simplified Map for Segment Selection */}
              <div className="border rounded-lg overflow-hidden">
                <div className="h-48 bg-gray-100 relative">
                  <MapView userPath={ride.path} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <p className="text-white text-sm bg-black/50 px-3 py-1 rounded">Select route segment to rate</p>
                  </div>
                </div>
              </div>

              {!isSelectingSegment && (
                <Button
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setIsSelectingSegment(true);
                    setEditingSegmentId(null);
                    setSegmentStartPoint(null);
                    setSegmentEndPoint(null);
                  }}
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Road Segment
                </Button>
              )}

              {isSelectingSegment && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-4 border-2 border-blue-600 rounded-lg bg-blue-50"
                >
                  <h4 className="text-gray-900 font-medium">
                    {editingSegmentId ? 'Edit Segment' : 'New Segment'}
                  </h4>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start Point</Label>
                        <Select
                          value={segmentStartPoint?.toString()}
                          onValueChange={(v) => setSegmentStartPoint(parseInt(v))}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select start" />
                          </SelectTrigger>
                          <SelectContent>
                            {ride.path.map((_, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                Point {index}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>End Point</Label>
                        <Select
                          value={segmentEndPoint?.toString()}
                          onValueChange={(v) => setSegmentEndPoint(parseInt(v))}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select end" />
                          </SelectTrigger>
                          <SelectContent>
                            {ride.path.map((_, index) => (
                              <SelectItem key={index} value={index.toString()} disabled={segmentStartPoint !== null && index <= segmentStartPoint}>
                                Point {index}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Road Condition</Label>
                      <Select value={segmentCondition} onValueChange={(v: any) => setSegmentCondition(v)}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              Excellent
                            </div>
                          </SelectItem>
                          <SelectItem value="good">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                              Good
                            </div>
                          </SelectItem>
                          <SelectItem value="fair">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500" />
                              Fair
                            </div>
                          </SelectItem>
                          <SelectItem value="poor">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              Needs Repair
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {segmentStartPoint !== null && segmentEndPoint !== null && (
                      <Card className="bg-white">
                        <CardContent className="p-3">
                          <p className="text-sm text-gray-600">
                            Selected: Points {segmentStartPoint} to {segmentEndPoint} ({segmentEndPoint - segmentStartPoint + 1} points)
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => {
                          setIsSelectingSegment(false);
                          setEditingSegmentId(null);
                          setSegmentStartPoint(null);
                          setSegmentEndPoint(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                        onClick={editingSegmentId ? handleUpdateSegment : handleAddSegment}
                      >
                        {editingSegmentId ? 'Update' : 'Add'} Segment
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* List of Segments */}
              {roadConditionSegments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-gray-900 font-medium">Road Segments ({roadConditionSegments.length})</h4>
                  {roadConditionSegments.map((segment) => (
                    <Card key={segment.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">Points {segment.startPoint} → {segment.endPoint}</span>
                              <Badge className={getConditionColor(segment.condition)} variant="secondary">
                                {getConditionText(segment.condition)}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600">
                              {segment.pathCoordinates.length} points, approx {(segment.pathCoordinates.length * 0.05).toFixed(2)} km
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditSegment(segment.id)}
                            >
                              <EditIcon className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => handleDeleteSegment(segment.id)}
                            >
                              <TrashIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setShowReportDialog(false)}
            >
              Close
            </Button>
            <Button
              className="flex-1 h-12 bg-green-600 hover:bg-green-700"
              onClick={() => {
                setShowReportDialog(false);
                toast.success('Road conditions saved');
              }}
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Save Reports
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}