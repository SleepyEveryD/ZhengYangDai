import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
  MapPinIcon
} from "lucide-react";
import { motion } from "motion/react";
import MapView from "./MapView";
import type { Ride } from "../types/ride";
import { findNearestPathIndex } from "../utils/geo";
import { IssueType } from "../types/issue";

/* =========================
   Types
========================= */

export enum RoadCondition {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  FAIR = "FAIR",
  NEED_REPAIR = "NEED_REPAIR",
}

export type RoadConditionSegment = {
  id: string;
  name: string;
  startPoint: number;
  endPoint: number;
  condition: RoadCondition;
  pathCoordinates: [number, number][];
};
/* =========================
   Constants
========================= */

const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  [IssueType.POTHOLE]: "Pothole",
  [IssueType.BUMP]: "Bump",
  [IssueType.GRAVEL]: "Gravel",
  [IssueType.CONSTRUCTION]: "Construction",
  [IssueType.OTHER]: "Other",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ride: Ride;
  issues: Ride["issues"];
  segments: RoadConditionSegment[];
  onChange: (data: {
    issues: Ride["issues"];
    segments: RoadConditionSegment[];
  }) => void;
  defaultTab?: "issues" | "conditions";
};

/* =========================
   Component
========================= */

export default function 
({
  open,
  onOpenChange,
  ride,
  issues,
  segments,
  onChange,
  defaultTab = "issues",
}: Props) {
  const [tab, setTab] = useState<"issues" | "conditions">(defaultTab);

  



  /* ---------- map / issue mode ---------- */
  const [mapMode, setMapMode] = useState<"none" | "issue">("none");
  const [highlightSegment, setHighlightSegment] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);
  

  /* ---------- issue editor ---------- */
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [selectedIssueLocation, setSelectedIssueLocation] =
    useState<[number, number] | null>(null);
    const [newIssueType, setNewIssueType] = useState<IssueType>(
      IssueType.POTHOLE
    );
    
  const [newIssueSeverity, setNewIssueSeverity] =
    useState<"low" | "medium" | "high">("medium");
  const [newIssueDescription, setNewIssueDescription] = useState("");

  /* =========================
     Utils
  ========================= */

  const isOther = newIssueType === IssueType.OTHER;
 
  

  const getIssueTypeText = (type: IssueType) => ISSUE_TYPE_LABEL[type] ?? "Other";


  const getSeverityText = (s: string) =>
    ({ low: "Minor", medium: "Moderate", high: "Severe" } as any)[s] ??
    "Unknown";

  const getSeverityColor = (s: string) =>
    ({
      low: "bg-yellow-100 text-yellow-800",
      medium: "bg-orange-100 text-orange-800",
      high: "bg-red-100 text-red-800",
    } as any)[s] ?? "bg-gray-100 text-gray-800";

  /* =========================
     Map click (Issue only)
  ========================= */

  const handleMapClick = (latLng: [number, number]) => {
    if (!ride.path?.length) return;
    const nearest = findNearestPathIndex(ride.path, latLng);
    setSelectedIssueLocation(ride.path[nearest.index]);
  };

  /* =========================
     Issue CRUD
  ========================= */

  const resetIssueEditor = () => {
    setIsEditingIssue(false);
    setEditingIssueId(null);
    setSelectedIssueLocation(null);
    setNewIssueDescription("");
    setMapMode("none");
  };

  const saveIssue = () => {
    if (!selectedIssueLocation) return;
    const isOther = newIssueType === IssueType.OTHER;

    if (isOther && !newIssueDescription.trim()) {
      alert("Please provide a description for 'Other' issue type.");
      return;
    }

    const nextIssues = editingIssueId
      ? issues.map((i) =>
          i.id === editingIssueId
            ? {
                ...i,
                type: newIssueType,
                severity: newIssueSeverity,
                description: newIssueDescription,
                location: selectedIssueLocation,
              }
            : i
        )
      : [
          ...issues,
          {
            id: `manual-${Date.now()}`,
            type: newIssueType,
            severity: newIssueSeverity,
            location: selectedIssueLocation,
            description: newIssueDescription,
            status: "confirmed",
            autoDetected: false,
            date: new Date().toISOString(),
          },
        ];

    onChange({ issues: nextIssues, segments });
    resetIssueEditor();
  };

  const editIssue = (id: string) => {
    const issue = issues.find((i) => i.id === id);
    if (!issue) return;

    setEditingIssueId(id);
    setIsEditingIssue(true);
    setMapMode("issue");
    setSelectedIssueLocation(issue.location);
    setNewIssueType(issue.type);
    setNewIssueSeverity(issue.severity);
    setNewIssueDescription(issue.description || "");
  };

  const deleteIssue = (id: string) => {
    onChange({
      issues: issues.filter((i) => i.id !== id),
      segments,
    });
  };

  /* =========================
     Render
  ========================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Road Conditions</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="issues">Issue Points</TabsTrigger>
            <TabsTrigger value="conditions">Road Segments</TabsTrigger>
          </TabsList>

          {/* ================= Issue Points ================= */}

          <TabsContent value="issues" className="space-y-4 mt-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-sm text-blue-900">
                <strong>Tip:</strong> Tap on the map below to place a marker where
                you encountered an issue.
              </CardContent>
            </Card>

            {/* Map */}
            <div className="h-48 border rounded overflow-hidden">
              <MapView
                userPath={ride.path}
                issues={issues.map((i) => ({
                  location: i.location,
                  type: i.type,
                }))}
                onMapClick={mapMode === "issue" ? handleMapClick : undefined}
              />
            </div>

            {!isEditingIssue && (
              <Button
                className="w-full h-12 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setIsEditingIssue(true);
                  setMapMode("issue"); // ✅ 关键
                  setSelectedIssueLocation(null);
                }}
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Issue Point
              </Button>
            )}

            {isEditingIssue && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 border-2 border-green-600 rounded-xl bg-green-50 space-y-5"
              >
                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingIssueId ? "Edit Issue" : "New Issue"}
                </h3>

                {/* Issue Type */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Issue Type</Label>

                  <Select
                    value={newIssueType}
                    onValueChange={(v) => setNewIssueType(v as IssueType)}
                  >
                    <SelectTrigger className="h-12 bg-gray-50">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {(Object.values(IssueType) as IssueType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {ISSUE_TYPE_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                {/* Severity Level */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Severity Level</Label>
                  <Select
                    value={newIssueSeverity}
                    onValueChange={(v: any) => setNewIssueSeverity(v)}
                  >
                    <SelectTrigger className="h-12 bg-gray-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Minor</SelectItem>
                      <SelectItem value="medium">Moderate</SelectItem>
                      <SelectItem value="high">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Location <span className="text-gray-500">(Tap map to select)</span>
                  </Label>

                  <div className="h-12 flex items-center px-4 rounded-md border bg-white text-sm text-gray-700">
                    {selectedIssueLocation
                      ? `${selectedIssueLocation[0].toFixed(4)}, ${selectedIssueLocation[1].toFixed(4)}`
                      : "Click on the map above to set location"}
                  </div>

                  {/* Demo button */}
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => {
                      if (!ride.path?.length) return;
                      const randomIndex = Math.floor(Math.random() * ride.path.length);
                      setSelectedIssueLocation(ride.path[randomIndex]);
                    }}
                  >
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    Pick Random Point (Demo)
                  </Button>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Description <span className="text-gray-500">(Optional)</span>
                  </Label>
                  <Textarea
                    placeholder="Describe the issue..."
                    value={newIssueDescription}
                    onChange={(e) => setNewIssueDescription(e.target.value)}
                    className="min-h-[96px] bg-gray-50"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={resetIssueEditor}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="flex-1 h-12 bg-orange-600 hover:bg-orange-700"
                    disabled={!selectedIssueLocation}
                    onClick={saveIssue}
                  >
                    {editingIssueId ? "Update Issue" : "Add Issue"}
                  </Button>
                </div>
              </motion.div>
            )}


            {issues.filter((i) => !i.autoDetected).length > 0 && (
              <div className="space-y-3">
                {issues
                  .filter((i) => !i.autoDetected)
                  .map((issue) => (
                    <Card key={issue.id}>
                      <CardContent className="p-3 flex justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {getIssueTypeText(issue.type as IssueType)}

                            </span>
                            <Badge className={getSeverityColor(issue.severity)}>
                              {getSeverityText(issue.severity)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">
                            {issue.location[0].toFixed(4)},{" "}
                            {issue.location[1].toFixed(4)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editIssue(issue.id)}
                          >
                            <EditIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => deleteIssue(issue.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* ================= Road Segments ================= */}

          <TabsContent value="conditions" className="space-y-4 mt-4">
            {/* Tip */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-sm text-blue-900">
                <strong>Tip:</strong> Review each street segment and select its road
                condition. Tap a street below to highlight it on the map.
              </CardContent>
            </Card>

            {/* Map (always visible in this tab) */}
            <div className="h-48 border rounded-lg overflow-hidden">
              <MapView
                userPath={ride.path}
                issues={issues.map((i) => ({
                  location: i.location,
                  type: i.type,
                }))}
                selectedSegment={highlightSegment ?? undefined}
              />
            </div>

            {/* Street / Segment list */}
            {segments.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-gray-900 font-medium">
                  Road Segments ({segments.length})
                </h4>

                {segments.map((segment, index) => (
                  <Card
                    key={segment.id}
                    className="cursor-pointer hover:border-blue-500 transition"
                    onClick={() =>
                      setHighlightSegment({
                        startIndex: segment.startPoint,
                        endIndex: segment.endPoint,
                      })
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        {/* Left: street name */}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {segment.name || `Unnamed road ${index + 1}`}
                          </p>
                          <p className="text-xs text-gray-600">
                            {segment.pathCoordinates.length} points · approx{" "}
                            {(segment.pathCoordinates.length * 0.05).toFixed(2)} km
                          </p>
                        </div>

                        {/* Right: road condition selector */}
                        <Select
                          value={segment.condition}
                          onValueChange={(v) =>
                            onChange({
                              issues,
                              segments: segments.map((s) =>
                                s.id === segment.id
                                  ? { ...s, condition: v as any }
                                  : s
                              ),
                            })
                          }
                        >
                          <SelectTrigger className="w-[160px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXCELLENT">Excellent</SelectItem>
                            <SelectItem value="GOOD">Good</SelectItem>
                            <SelectItem value="FAIR">Fair</SelectItem>
                            <SelectItem value="NEED_REPAIR">
                              Needs Repair
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-600">
                  No road segments available for this ride.
                </CardContent>
              </Card>
            )}
          </TabsContent>


        </Tabs>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => onOpenChange(false)}
          >
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            Save Reports
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}