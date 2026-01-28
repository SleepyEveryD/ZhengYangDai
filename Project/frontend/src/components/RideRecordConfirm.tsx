import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { ArrowLeftIcon, CheckCircleIcon, XIcon, SaveIcon, ShareIcon, AlertCircleIcon, MapPinIcon, PlusIcon, EditIcon, TrashIcon } from 'lucide-react';
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
import { useNavigate,useLocation } from 'react-router-dom';
import { getCurrentRide,saveRideLocal } from '../services/rideStorage';
import { findNearestPathIndex } from "../utils/geo";
import { useAuth } from '../auth/AuthContext';
import { Navigate } from 'react-router-dom';
import Weather from "./Weather";
import IssueList from "./IssueList";
import RoadConditionList from "./RoadConditionList";
import RoadConditionRequiredCard from "./RoadConditionRequiredCard";


import { mapUiIssueToRideIssue } from '../utils/issueMapper';

enum RoadCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  NEED_REPAIR = 'NEED_REPAIR',
}

type RoadConditionSegment = {
  id: string;
  name: string;
  startPoint: number;
  endPoint: number;
  condition: RoadCondition;
  pathCoordinates: [number, number][];
};


function buildSegmentsFromStreets(ride: Ride): RoadConditionSegment[] {
  
  if (!ride.streets?.length || !ride.path?.length) return [];

  return ride.streets.map((street, i) => {
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
      name: street.name || `Unnamed road ${i + 1}`, // ✅ 关键
      startPoint: start,
      endPoint: end,
      condition: RoadCondition.GOOD,
      pathCoordinates: ride.path.slice(start, end + 1),
    };
  });
}





export default function RideRecordConfirm() {
  const { user } = useAuth();

  if (!user) {
    // 没登录就回登录页（或给 guest 模式）
    return <Navigate to="/login" replace />;
  }

  const navigate = useNavigate();
  const location = useLocation();
  const ride: Ride | null = location.state?.ride ?? null;

  const [mapMode, setMapMode] = useState<"none" | "issue" | "segment">("none");


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
  
  const segmentStartRef = useRef<number | null>(segmentStartPoint);
  const segmentEndRef = useRef<number | null>(segmentEndPoint);
  const mapModeRef = useRef(mapMode);
  const [highlightSegment, setHighlightSegment] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);
  const [conditionsConfirmed, setConditionsConfirmed] = useState(false);


  useEffect(() => {
    console.log('RideRecodConfirm>> issues updated:', issues);
  }, [issues]);
  

  useEffect(() => { segmentStartRef.current = segmentStartPoint; }, [segmentStartPoint]);
  useEffect(() => { segmentEndRef.current = segmentEndPoint; }, [segmentEndPoint]);
  useEffect(() => { mapModeRef.current = mapMode; }, [mapMode]);
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
  // Current step in the workflow
  const [currentStep, setCurrentStep] = useState<'stats' | 'report' | 'review'>('stats');
  

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

  if (mapMode === "issue") {
    setSelectedIssueLocation(snapped);
    toast.success(`Issue location selected (point ${nearest.index})`);
    return;
  }

  if (mapMode === "segment") {
    // 第一次点：Start
    if (segmentStartPoint === null) {
      setSegmentStartPoint(nearest.index);
      setSegmentEndPoint(null);
      toast.success(`Segment start selected (point ${nearest.index})`);
      return;
    }

    // 第二次点：End
    if (nearest.index === segmentStartPoint) {
      toast.error("End point must be different from start point");
      return;
    }

    setSegmentEndPoint(nearest.index);
    toast.success(`Segment end selected (point ${nearest.index})`);
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
  const storedRide = getCurrentRide();
  type RideStatus = 'DRAFT' | 'CONFIRMED';

  const saveRide = (status: RideStatus) => {
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
      status,
      roadConditionSegments,
      uploadStatus: 'pending', // 👈 关键
      confirmedAt: new Date().toISOString(),
    };
  
    //console.log("SAVE CLICKED: passed validation");
    //console.log("finalRide", finalRide);
    saveRideLocal(finalRide);
  
    toast.success('Ride saved locally');
    navigate('/map');
  };
  

  const handleSaveAndPublish = () => {
    //必须先save
    if (!conditionsConfirmed) {
      toast.error('Please save road condition reports first');
      setShowReportDialog(true);
      setReportTab('conditions');
      return;
    }
    saveRide('CONFIRMED');

  };
  
  const handleSaveOnly = () => {
    saveRide('DRAFT');
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
    //console.log("RideRecordingConfirm>> issue: ", issues);
    
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
    const segment = roadConditionSegments.find(s => s.id === segmentId);
    if (!segment) return;
  
    setEditingSegmentId(segmentId);
    setSegmentCondition(segment.condition);
  
    // ✅ 关键：告诉 map 要 highlight 哪一段
    setHighlightSegment({
      startIndex: segment.startPoint,
      endIndex: segment.endPoint,
    });
  
    setMapMode("segment");
    setReportTab('conditions');
    setShowReportDialog(true);
  };
  

  const handleUpdateSegment = () => {
    if (!editingSegmentId) return;
  
    setRoadConditionSegments(prev =>
      prev.map(segment =>
        segment.id === editingSegmentId
          ? { ...segment, condition: segmentCondition }
          : segment
      )
    );
  
    setEditingSegmentId(null);
    setHighlightSegment(null); // ✅
    setMapMode("none");
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
            onMapClick={mapMode !== "none" ? handleMapClick : undefined}
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
            <Weather/>
          </div>
          <IssueList issues={issues} />

          

          {issues.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-gray-600">No road issues detected on this ride</p>
              </CardContent>
            </Card>
          )}
          

          {/* Report Road Conditions Button */}
          <RoadConditionRequiredCard
            hasSegments={roadConditionSegments.length > 0}
            onOpenEditor={() => {
              setReportTab("conditions");
              setShowReportDialog(true);
            }}
          />


          {/* Road Condition Segments Preview */}
          {conditionsConfirmed && (
            <RoadConditionList segments={roadConditionSegments} />
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
          Save only
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
      <Dialog
        open={showReportDialog}
        onOpenChange={(open) => {
          setShowReportDialog(open);
          if (!open) {
            setHighlightSegment(null);
            setMapMode("none");
          }
        }}
        
      >
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
                  <MapView
                    userPath={ride.path}
                    issues={issues.map((issue) => ({ location: issue.location, type: issue.type }))}
                    onMapClick={mapMode === "issue" ? handleMapClick : undefined}
                  />
                  
                </div>
              </div>

              {!isAddingIssue && (
                <Button
                  className="w-full h-12 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setIsAddingIssue(true);
                    setMapMode("issue");
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
                          setMapMode("none");
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
                <MapView
                  userPath={ride.path}
                  issues={issues.map((issue) => ({
                    location: issue.location,
                    type: issue.type,
                  }))}
                  selectedSegment={highlightSegment ?? undefined}
                />

                </div>
              </div>

              

        

              {/* List of Segments */}
              {roadConditionSegments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-gray-900 font-medium">Road Segments ({roadConditionSegments.length})</h4>
                  {roadConditionSegments.map((segment) => (
                    <Card
                    key={segment.id}
                    className="cursor-pointer hover:border-blue-500 transition"
                    onClick={() => {
                      setHighlightSegment({
                        startIndex: segment.startPoint,
                        endIndex: segment.endPoint,
                      });
                    }}
                  >
                  
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          {/* 左：Segment 名字 */}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {segment.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {segment.pathCoordinates.length} points · approx{' '}
                              {(segment.pathCoordinates.length * 0.05).toFixed(2)} km
                            </p>
                          </div>

                          {/* 右：Condition dropdown */}
                          <Select
                            value={segment.condition}
                            onValueChange={(v) => {
                              setRoadConditionSegments(prev =>
                                prev.map(s =>
                                  s.id === segment.id
                                    ? { ...s, condition: v as RoadCondition }
                                    : s
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="w-[160px] h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={RoadCondition.EXCELLENT}>
                                Excellent
                              </SelectItem>
                              <SelectItem value={RoadCondition.GOOD}>
                                Good
                              </SelectItem>
                              <SelectItem value={RoadCondition.FAIR}>
                                Fair
                              </SelectItem>
                              <SelectItem value={RoadCondition.NEED_REPAIR}>
                                Needs Repair
                              </SelectItem>
                            </SelectContent>
                          </Select>
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
                setConditionsConfirmed(true);   // ✅ 关键
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