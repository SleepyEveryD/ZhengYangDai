import type { Issue } from "./issue";

export type Ride = {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  path: [number, number][];
  issues: Issue[];
};
