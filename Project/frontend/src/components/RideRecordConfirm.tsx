import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XIcon,
  SaveIcon,
  ShareIcon,
  AlertCircleIcon,
  MapPinIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import MapView from './MapView';
import type { Ride } from '../types/ride';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { saveRideLocal } from '../services/rideStorage';
import { findNearestPathIndex } from '../utils/geo';
import { useAuth } from '../auth/AuthContext';
import Weather from './Weather';
import { supabase } from "../lib/supabase";

export enum RoadCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  NEED_REPAIR = 'NEED_REPAIR',
}

type RoadConditionSegment = {
  id: string;
  name: string;
  streetExternalId: string;
  startPoint: number;
  endPoint: number;
  condition: RoadCondition;
  notes?: string;
  pathCoordinates: [number, number][];
};

function buildSegmentsFromStreets(ride: Ride): RoadConditionSegment[] {
  if (!ride.streets?.length || !ride.path?.length) return [];

  return ride.streets.map((street: any, i: number) => {
    const idx = street.positions[0].index;

    let start = idx;
    let end = idx;

    if (street.positions.length === 1) {
      if (idx === 0) end = 1;
      else if (idx === ride.path.length - 1) start = idx - 1;
      else {
        start = idx - 1;
        end = idx + 1;
      }
    }

    return {
      id: `segment-${i}-${start}-${end}`,
      name: street.name || `Unnamed road ${i + 1}`,
      streetExternalId: street.externalId, // ✅关键
      startPoint: start,
      endPoint: end,
      condition: RoadCondition.GOOD,
      notes: '',
      pathCoordinates: ride.path.slice(start, end + 1),
    };
  });
}

export default function RideRecordConfirm() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const navigate = useNavigate();
  const location = useLocation();
  const ride: Ride | null = location.state?.ride ?? null;

  const [mapMode, setMapMode] = useState<'none' | 'issue' | 'segment'>('none');
  const [issues, setIssues] = useState<any[]>(ride?.issues || []);
  const [showUnconfirmedWarning, setShowUnconfirmedWarning] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportTab, setReportTab] = useState<'issues' | 'conditions'>('issues');

  const [roadConditionSegments, setRoadConditionSegments] = useState<RoadConditionSegment[]>([]);
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [selectedIssueLocation, setSelectedIssueLocation] = useState<[number, number] | null>(null);
  const [newIssueType, setNewIssueType] = useState<'pothole' | 'crack' | 'obstacle'>('pothole');
  const [newIssueSeverity, setNewIssueSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);

  const [segmentStartPoint, setSegmentStartPoint] = useState<number | null>(null);
  const [segmentEndPoint, setSegmentEndPoint] = useState<number | null>(null);

  const segmentStartRef = useRef<number | null>(segmentStartPoint);
  const segmentEndRef = useRef<number | null>(segmentEndPoint);
  const mapModeRef = useRef(mapMode);

  const [highlightSegment, setHighlightSegment] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [conditionsConfirmed, setConditionsConfirmed] = useState(false);

  useEffect(() => {
    segmentStartRef.current = segmentStartPoint;
  }, [segmentStartPoint]);

  useEffect(() => {
    segmentEndRef.current = segmentEndPoint;
  }, [segmentEndPoint]);

  useEffect(() => {
    mapModeRef.current = mapMode;
  }, [mapMode]);

  useEffect(() => {
    if (!ride) return;
    setRoadConditionSegments(buildSegmentsFromStreets(ride));
  }, [ride]);

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

  const handleMapClick = (latLng: [number, number]) => {
    if (!ride?.path?.length) return;

    const nearest = findNearestPathIndex(ride.path, latLng);
    const snapped = ride.path[nearest.index];

    if (mapMode === 'issue') {
      setSelectedIssueLocation(snapped);
      toast.success(`Issue location selected (point ${nearest.index})`);
      return;
    }

    if (mapMode === 'segment') {
      if (segmentStartPoint === null) {
        setSegmentStartPoint(nearest.index);
        setSegmentEndPoint(null);
        toast.success(`Segment start selected (point ${nearest.index})`);
        return;
      }

      if (nearest.index === segmentStartPoint) {
        toast.error('End point must be different from start point');
        return;
      }

      setSegmentEndPoint(nearest.index);
      toast.success(`Segment end selected (point ${nearest.index})`);
    }
  };

  const handleConfirmIssue = (issueId: string) => {
    setIssues((prev) => prev.map((issue) => (issue.id === issueId ? { ...issue, status: 'confirmed' as const } : issue)));
  };

  const handleIgnoreIssue = (issueId: string) => {
    setIssues((prev) => prev.filter((issue) => issue.id !== issueId));
  };

  const pendingIssues = issues.filter((issue) => issue.status === 'pending');
  const confirmedIssues = issues.filter((issue) => issue.status === 'confirmed');

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

  const handleEditIssue = (issueId: string) => {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;

    setEditingIssueId(issueId);
    setSelectedIssueLocation(issue.location);
    setNewIssueType(issue.type);
    setNewIssueSeverity(issue.severity);
    setNewIssueDescription(issue.description || '');
    setIsAddingIssue(true);
    setReportTab('issues');
    setShowReportDialog(true);
  };

  const handleUpdateIssue = () => {
    if (!editingIssueId || !selectedIssueLocation) return;

    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === editingIssueId
          ? { ...issue, type: newIssueType, location: selectedIssueLocation, severity: newIssueSeverity, description: newIssueDescription }
          : issue,
      ),
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

  type RideStatus = 'DRAFT' | 'CONFIRMED';

  const saveRideLocalOnly = (status: RideStatus) => {
    if (issues.some((issue) => issue.status === 'pending')) {
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
      status,
      roadConditionSegments,
      uploadStatus: 'pending',
      confirmedAt: new Date().toISOString(),
    };

    saveRideLocal(finalRide);
    toast.success('Ride saved locally');
    navigate('/map');
  };

  // ✅ 重点：发布到后端（POST /rides/:rideId/confirm），body 必须 status=CONFIRMED
  const publishRideRemote = async (finalRideBody: any) => {
  // ✅ 从 supabase session 拿 token
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error("No access token (please login again)");
  }

  const res = await fetch(`/rides/${finalRideBody.id}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // ✅ 关键
    },
    body: JSON.stringify(finalRideBody),
  });

  const text = await res.text();
  if (!res.ok) {
    // 你后端一般返回 JSON 字符串，这里直接抛出来方便你看
    throw new Error(text || "Publish failed");
  }

  return text ? JSON.parse(text) : {};
};


  const handleSaveAndPublish = async () => {
    if (!conditionsConfirmed) {
      toast.error('Please save road condition reports first');
      setShowReportDialog(true);
      setReportTab('conditions');
      return;
    }

    if (issues.some((issue) => issue.status === 'pending')) {
      toast.error('Please confirm or ignore all pending issues');
      return;
    }

    if (roadConditionSegments.length === 0) {
      toast.error('Please add at least one road condition segment');
      setShowReportDialog(true);
      setReportTab('conditions');
      return;
    }

    const finalRideBody = {
      ...ride,
      id: ride.id,                 // ✅ Controller 会检查 id mismatch（可选）
      status: 'CONFIRMED',         // ✅ Controller 必须
      issues,
      roadConditionSegments,       // ✅ 后端用这个写 StreetReport
      confirmedAt: new Date().toISOString(),
    };

    try {
      await publishRideRemote(finalRideBody);

      // 成功后本地也存一份（CONFIRMED）
      saveRideLocal({
        ...finalRideBody,
        uploadStatus: 'pending',
      });

      toast.success('Ride published');
      navigate('/map');
    } catch (e: any) {
      console.error(e);
      toast.error(`Publish failed: ${e?.message ?? 'unknown error'}`);
    }
  };

  const handleSaveOnly = () => saveRideLocalOnly('DRAFT');

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate('/map')} className="h-10 w-10">
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h2 className="text-gray-900">Confirm Ride Data</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="h-64">
          <MapView
            userPath={ride.path}
            issues={issues.map((issue) => ({ location: issue.location, type: issue.type }))}
            onMapClick={mapMode !== 'none' ? handleMapClick : undefined}
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

          <div className="mb-4">
            <Weather />
          </div>

          {/* Detected Issues */}
          {issues.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900">Reported Issues ({issues.length})</h3>
                {pendingIssues.length > 0 && <Badge className="bg-orange-100 text-orange-800">{pendingIssues.length} pending</Badge>}
              </div>

              {showUnconfirmedWarning && pendingIssues.length > 0 && (
                <Card className="bg-orange-50 border-orange-200 mb-3">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircleIcon className="w-5 h-5 text-orange-600 mt-0.5" />
                      <p className="text-orange-900">{pendingIssues.length} issues pending confirmation, please review before saving.</p>
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
                            <span className="text-gray-900">{getIssueTypeText(issue.type)}</span>
                            <Badge className={getSeverityColor(issue.severity)} variant="secondary">
                              {getSeverityText(issue.severity)}
                            </Badge>
                            {issue.autoDetected && <Badge variant="outline">Auto-detected</Badge>}
                          </div>
                          <p className="text-gray-600">
                            Location: {issue.location[0].toFixed(4)}, {issue.location[1].toFixed(4)}
                          </p>
                        </div>
                        {issue.status === 'confirmed' && <CheckCircleIcon className="w-6 h-6 text-green-600" />}
                      </div>

                      {issue.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" className="flex-1 h-10" onClick={() => handleIgnoreIssue(issue.id)}>
                            <XIcon className="w-4 h-4 mr-2" />
                            Ignore
                          </Button>
                          <Button className="flex-1 h-10 bg-orange-600 hover:bg-orange-700" onClick={() => handleConfirmIssue(issue.id)}>
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
                  <p className="text-orange-800 text-sm">You must add at least one road condition segment before saving your ride data.</p>
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
          {conditionsConfirmed && roadConditionSegments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900">Road Condition Segments ({roadConditionSegments.length})</h3>
              </div>

              <div className="space-y-3">
                {roadConditionSegments.map((segment) => (
                  <Card key={segment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{segment.name}</p>
                          <p className="text-xs text-gray-600">streetExternalId: {segment.streetExternalId}</p>
                        </div>
                        <Badge variant="secondary">{segment.condition}</Badge>
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
        <Button variant="outline" className="w-full h-12" onClick={handleSaveOnly}>
          <SaveIcon className="w-5 h-5 mr-2" />
          Save only
        </Button>
        <Button className="w-full h-12 bg-green-600 hover:bg-green-700" onClick={handleSaveAndPublish}>
          <ShareIcon className="w-5 h-5 mr-2" />
          Save and Publish
          {confirmedIssues.length > 0 && ` (${confirmedIssues.length} reports)`}
        </Button>
      </div>

      {/* Report Road Conditions Dialog */}
      <Dialog
        open={showReportDialog}
        onOpenChange={(open) => {
          setShowReportDialog(open);
          if (!open) {
            setHighlightSegment(null);
            setMapMode('none');
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Road Conditions</DialogTitle>
          </DialogHeader>

          <Tabs value={reportTab} onValueChange={(v) => setReportTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="issues">Issue Points</TabsTrigger>
              <TabsTrigger value="conditions">
                Road Segments
                {roadConditionSegments.length > 0 && (
                  <span className="ml-2 bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {roadConditionSegments.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* issues tab（你原来的完整 UI 直接放回这里也行） */}
            <TabsContent value="issues" className="space-y-4 mt-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-blue-900 text-sm">
                    <strong>Tip:</strong> Tap on the map below to place a marker where you encountered an issue.
                  </p>
                </CardContent>
              </Card>

              <div className="border rounded-lg overflow-hidden">
                <div className="h-48 bg-gray-100 relative">
                  <MapView
                    userPath={ride.path}
                    issues={issues.map((issue) => ({ location: issue.location, type: issue.type }))}
                    onMapClick={mapMode === 'issue' ? handleMapClick : undefined}
                  />
                </div>
              </div>

              {!isAddingIssue && (
                <Button
                  className="w-full h-12 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setIsAddingIssue(true);
                    setMapMode('issue');
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
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-4 border-2 border-green-600 rounded-lg bg-green-50">
                  <h4 className="text-gray-900 font-medium">{editingIssueId ? 'Edit Issue' : 'New Issue'}</h4>

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
                        {selectedIssueLocation ? `${selectedIssueLocation[0].toFixed(4)}, ${selectedIssueLocation[1].toFixed(4)}` : 'Click on the map above to set location'}
                      </div>
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
                          setMapMode('none');
                          setEditingIssueId(null);
                          setSelectedIssueLocation(null);
                          setNewIssueDescription('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button className="flex-1 h-12 bg-orange-600 hover:bg-orange-700" onClick={editingIssueId ? handleUpdateIssue : handleAddManualIssue}>
                        {editingIssueId ? 'Update' : 'Add'} Issue
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {issues.filter((i) => !i.autoDetected).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-gray-900 font-medium">Manual Issues ({issues.filter((i) => !i.autoDetected).length})</h4>
                  {issues
                    .filter((i) => !i.autoDetected)
                    .map((issue) => (
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
                              {issue.description && <p className="text-sm text-gray-600 mt-1">{issue.description}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditIssue(issue.id)}>
                                <EditIcon className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteIssue(issue.id)}>
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

            {/* conditions tab：核心就是 Select 改 condition + notes */}
            <TabsContent value="conditions" className="space-y-4 mt-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-blue-900 text-sm">
                    <strong>Tip:</strong> Rate each street segment.
                  </p>
                </CardContent>
              </Card>

              <div className="border rounded-lg overflow-hidden">
                <div className="h-48 bg-gray-100 relative">
                  <MapView userPath={ride.path} issues={[]} selectedSegment={highlightSegment ?? undefined} />
                </div>
              </div>

              {roadConditionSegments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-gray-900 font-medium">Road Segments ({roadConditionSegments.length})</h4>

                  {roadConditionSegments.map((segment) => (
                    <Card
                      key={segment.id}
                      className="cursor-pointer hover:border-blue-500 transition"
                      onClick={() => setHighlightSegment({ startIndex: segment.startPoint, endIndex: segment.endPoint })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{segment.name}</p>
                            <p className="text-xs text-gray-600">streetExternalId: {segment.streetExternalId}</p>
                          </div>

                          <Select
                            value={segment.condition}
                            onValueChange={(v) => {
                              setRoadConditionSegments((prev) =>
                                prev.map((s) => (s.id === segment.id ? { ...s, condition: v as RoadCondition } : s)),
                              );
                            }}
                          >
                            <SelectTrigger className="w-[180px] h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={RoadCondition.EXCELLENT}>Excellent</SelectItem>
                              <SelectItem value={RoadCondition.GOOD}>Good</SelectItem>
                              <SelectItem value={RoadCondition.FAIR}>Fair</SelectItem>
                              <SelectItem value={RoadCondition.NEED_REPAIR}>Needs Repair</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="mt-3">
                          <Label className="text-xs">Notes (optional)</Label>
                          <Textarea
                            className="min-h-16 mt-1"
                            placeholder="Write notes..."
                            value={segment.notes ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRoadConditionSegments((prev) =>
                                prev.map((s) => (s.id === segment.id ? { ...s, notes: val } : s)),
                              );
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setShowReportDialog(false)}>
              Close
            </Button>
            <Button
              className="flex-1 h-12 bg-green-600 hover:bg-green-700"
              onClick={() => {
                setConditionsConfirmed(true);
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
