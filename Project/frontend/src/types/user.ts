export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  totalDistance: number;
  totalRides: number;
  totalReports: number;
} | null;
