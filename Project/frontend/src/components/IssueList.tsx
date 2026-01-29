import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { AlertCircleIcon } from "lucide-react";

type Issue = {
  id: string;
  type: string;
  severity?: string;
  location: [number, number];
  notes?: string;
};

type IssueListProps = {
  issues: Issue[];
  title?: string;
};

export default function IssueList({
  issues,
  title = "Reported Issues",
}: IssueListProps) {
  if (!issues || issues.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertCircleIcon className="w-5 h-5 text-gray-600" />
        <span className="text-gray-900 font-medium">
          {title} ({issues.length})
        </span>
      </div>

      {/* Issue cards */}
      <div className="space-y-3">
        {issues.map((issue) => (
          <Card key={issue.id}>
            <CardContent className="p-4 space-y-2">
              {/* type + severity */}
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-medium">
                  {getIssueTypeText(issue.type)}
                </span>

                {issue.severity && (
                  <Badge className={getSeverityColor(issue.severity)}>
                    {getSeverityText(issue.severity)}
                  </Badge>
                )}
              </div>

              {/* location */}
              <p className="text-gray-600 text-xs">
                {issue.location[0].toFixed(5)},{" "}
                {issue.location[1].toFixed(5)}
              </p>

              {/* notes */}
              {issue.notes !== undefined && (
                <p className="text-gray-500 text-sm leading-snug">
                  {issue.notes.trim()
                    ? issue.notes
                    : ""}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- helpers（与 Confirm 页面保持一致） ---------------- */

function getIssueTypeText(type: string) {
  switch (type) {
    case "pothole":
      return "Pothole";
    case "crack":
      return "Crack";
    case "obstacle":
      return "Obstacle";
    default:
      return "Other";
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-orange-100 text-orange-800";
    case "low":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getSeverityText(severity: string) {
  switch (severity) {
    case "high":
      return "Severe";
    case "medium":
      return "Moderate";
    case "low":
      return "Minor";
    default:
      return "Unknown";
  }
}
