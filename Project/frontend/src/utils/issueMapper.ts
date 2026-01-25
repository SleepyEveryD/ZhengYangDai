// this method is used in rideRecodConfirm file, used to convert 
import type { Issue as RideIssue, IssueType } from '@/types/issue';

/**
 * UI 层 Issue（地图 / 表单用）
 * ⚠️ 如果你已经有类型，可以直接 import
 */
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
 * UI issue type → Ride issue type 映射
 */
const issueTypeMap: Record<string, IssueType> = {
  pothole: 'POTHOLE',
  bump: 'BUMP',
  gravel: 'GRAVEL',
  construction: 'CONSTRUCTION',
  other: 'OTHER',
};

/**
 * 把 UI Issue 转换成 Ride Issue
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
