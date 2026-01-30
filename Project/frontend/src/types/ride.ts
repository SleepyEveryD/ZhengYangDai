import type { Issue } from './issue';
import type { RideStreet } from "./rideStreet";

export type RideStatus = "Draft"| "CONFIRMED"

export type Ride = {
  id: string;
  userId: string;
  status: RideStatus;
  startedAt: Date;   // Prisma DateTime
  endedAt?: Date | null;     // Prisma DateTime

  distance: number; // km
  duration: number; // sec
  avgSpeed: number; // km/h
  maxSpeed: number; // km/h

  routeGeoJson?: GeoJSON.LineString; // 可选
  // routeGeometry ❌ 前端不用直接接 geography
  streets?: RideStreet[]; // 如果你 include 了
  issues?: Issue[];       // 如果是聚合结果
  path?: any;
  date?: string;
};
