import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { RulerIcon } from "lucide-react";

export type RoadConditionSegment = {
  id: string;
  name: string;
  startPoint: number;
  endPoint: number;
  condition: string;
  pathCoordinates: [number, number][];
};

type Props = {
  segments: RoadConditionSegment[];
  title?: string;
};

export default function RoadConditionList({
  segments,
  title = "Road Conditions",
}: Props) {
  if (!segments || segments.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <RulerIcon className="w-5 h-5 text-gray-600" />
        <span className="text-gray-900">
          {title} ({segments.length})
        </span>
      </div>

      <div className="space-y-3">
        {segments.map((seg) => (
          <Card key={seg.id}>
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-900">
                  {seg.name || "Unknown Street"}
                </span>

                <Badge className={getConditionColor(seg.condition)}>
                  {getConditionText(seg.condition)}
                </Badge>
              </div>

    
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- helpers（和 Confirm Page 一致） ---------------- */

function getConditionText(condition: string) {
  switch (condition) {
    case "EXCELLENT":
      return "Excellent";
    case "GOOD":
      return "Good";
    case "FAIR":
      return "Fair";
    case "NEED_REPAIR":
      return "Needs Repair";
    default:
      return condition;
  }
}

function getConditionColor(condition: string) {
  switch (condition) {
    case "EXCELLENT":
      return "bg-green-100 text-green-800";
    case "GOOD":
      return "bg-blue-100 text-blue-800";
    case "FAIR":
      return "bg-yellow-100 text-yellow-800";
    case "NEED_REPAIR":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
