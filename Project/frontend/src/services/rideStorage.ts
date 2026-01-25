import type { Ride } from '../types/ride';

const STORAGE_KEY = 'current_ride';

export function saveRideLocal(ride: Ride) {
  //console.log("rideStorage>> saveRideLocal called")
  localStorage.removeItem(STORAGE_KEY);
  //console.log("rideStorage>> current ride removed")

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(ride)
  );

  console.log("after save", localStorage.getItem(STORAGE_KEY));
}


export function getCurrentRide(): (Ride) | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw);

  return {
    ...parsed,
    startedAt: new Date(parsed.startedAt),
    endedAt: parsed.endedAt ? new Date(parsed.endedAt) : null,
  };
}


