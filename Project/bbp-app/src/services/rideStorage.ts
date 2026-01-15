import type { Ride } from '../types/ride';

const STORAGE_KEY = 'rides';

export function saveRideLocal(ride: Ride & { uploadStatus: string }) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...existing, ride])
  );
}

export function getPendingRides() {
  const rides = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return rides.filter((r: any) => r.uploadStatus === 'pending');
}
