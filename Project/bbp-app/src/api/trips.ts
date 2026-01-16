import { http } from "./http";

export type Trip = {
  id: string;
  userId: string;
  status: "recording" | "completed";
  startedAt: string;
  stoppedAt?: string | null;
  distanceKm?: number | null;
  durationSec?: number | null;
};

export async function startTrip(userId: string) {
  const res = await http.post<{ trip: Trip }>("/trips/start", { userId });
  return res.data.trip;
}

export async function stopTrip(tripId: string, distanceKm: number, durationSec: number) {
  const res = await http.post<{ trip: Trip }>("/trips/stop", { tripId, distanceKm, durationSec });
  return res.data.trip;
}

export async function getTripHistory(userId: string) {
  const res = await http.get<{ trips: Trip[] }>("/trips/history", { params: { userId } });
  return res.data.trips;
}
