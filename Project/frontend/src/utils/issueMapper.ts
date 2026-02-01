// this method is used in rideRecodConfirm file, used to convert 
import type { Issue as RideIssue, IssueType } from '@/types/issue';


export type UiIssue = {
  id: string;
  type: string;
  location: [number, number];
  severity: string;
  status: string;
  autoDetected: boolean;
  date: string;
  description?: string;
};

/**
 * UI issue type → Ride issue type map
 */
const issueTypeMap: Record<string, IssueType> = {
  pothole: 'POTHOLE',
  bump: 'BUMP',
  gravel: 'GRAVEL',
  construction: 'CONSTRUCTION',
  other: 'OTHER',
};

/**
 * Convert UI Issue to Ride Issue
 */
export function mapUiIssueToRideIssue(
  uiIssue: UiIssue,
): RideIssue {
  return {
    issueType: issueTypeMap[uiIssue.type] ?? 'OTHER',
    location: {
      lat: uiIssue.location[0],
      lng: uiIssue.location[1],
    },
    notes: uiIssue.description || undefined,
    createdAt: new Date(uiIssue.date),
  };



}
