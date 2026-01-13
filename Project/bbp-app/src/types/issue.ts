export type IssueType = 'pothole' | 'crack' | 'obstacle' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'pending' | 'confirmed' | 'fixed';

export type Issue = {
  id: string;
  type: IssueType;
  location: [number, number]; // [lat, lng]
  severity: IssueSeverity;
  status: IssueStatus;
  date: string;
  description?: string;
  autoDetected?: boolean;
};
