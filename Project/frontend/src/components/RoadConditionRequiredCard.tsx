import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { AlertCircleIcon, MapPinIcon } from "lucide-react";

type Props = {
  hasSegments: boolean;
  onOpenEditor: () => void;
};

export default function RoadConditionRequiredCard({
  hasSegments,
  onOpenEditor,
}: Props) {
  return (
    <Card className="bg-orange-50 border-2 border-orange-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <AlertCircleIcon className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-orange-900 font-medium mb-1">
              Required: Report Road Conditions and Issues
            </p>
            <p className="text-orange-800 text-sm">
              Your reports are critical to other users, let's build a perfect cycling world.
            </p>
          </div>
        </div>

        <Button
          className="w-full h-12 bg-orange-600 hover:bg-orange-700"
          onClick={onOpenEditor}
        >
          <MapPinIcon className="w-5 h-5 mr-2" />
          {hasSegments
            ? "Edit Road Conditions"
            : "Add Road Conditions (Required)"}
        </Button>
      </CardContent>
    </Card>
  );
}
