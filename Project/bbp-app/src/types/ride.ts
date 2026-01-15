import type { Issue } from './issue';

export type Ride = {
  id: string;
  date: string;
  distance: number;      // km
  duration: number;      // seconds
  avgSpeed: number;      // km/h
  maxSpeed?: number;     // km/h
  path: [number, number][];
  issues: Issue[];
};
