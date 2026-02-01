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

  routeGeoJson?: GeoJSON.LineString; // optional
  streets?: RideStreet[]; 
  issues?: Issue[];       
  date?: string;
};
