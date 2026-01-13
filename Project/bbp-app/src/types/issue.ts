export type Issue = {
    id: string;
    type: 'pothole' | 'crack' | 'obstacle' | 'other';
    location: [number, number];
    severity: 'low' | 'medium' | 'high';
    status: 'pending' | 'confirmed' | 'fixed';
    date: string;
    description?: string;
    autoDetected?: boolean;
  };