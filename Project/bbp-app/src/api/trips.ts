/*import { http } from "./http";

export type Trip = {
  id: string;
  userId: string;
  status: "recording" | "completed";
  startedAt: string;
  stoppedAt?: string | null;
  distanceKm?: number | null;
  durationSec?: number | null;
};

export type CreateTripInput = {
  userId: string;
  startedAt: string;
  stoppedAt: string;
  distanceKm: number;
  durationSec: number;
};

export async function createTrip(input: CreateTripInput) {
  const res = await http.post<{ trip: Trip }>("/trips", input);
  return res.data.trip;
}

export async function getTripHistory(userId: string) {
  const res = await http.get<{ trips: Trip[] }>("/trips/history", { params: { userId } });
  return res.data.trips;
}
*/