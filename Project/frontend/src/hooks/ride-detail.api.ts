import api from "../lib/api";

/* =========================
 * Weather
 * ========================= */
export interface RideWeatherApi {
  temp?: number;
  condition?: string;
  wind?: string;
  raw?: any;
  createdAt: string;
  updatedAt: string;
}

/* =========================
 * Issues
 * ========================= */
export interface RideDetailIssueApi {
  id: string;
  issueType: string;
  locationJson?: {
    coordinates: [number, number];
  };
  createdAt: string;
}

/* =========================
 * Street Reports
 * ========================= */
export interface RideStreetReportApi {
  id: string;
  roadCondition: "EXCELLENT" | "GOOD" | "FAIR" | "NEED_REPAIR";
  notes?: string;
  createdAt: string;
  street: {
    id: string;
    name?: string;
    city?: string;
  };
}

/* =========================
 * Ride Detail Response
 * ========================= */
export interface RideDetailApiResponse {
  id: string;
  status: "DRAFT" | "CONFIRMED";
  startedAt: string;
  endedAt: string;

  routeGeoJson?: {
    coordinates: [number, number][];
  };

  // weather information (optional)
  weather?: RideWeatherApi | null;

  // Street roadcondition reports
  reports: RideStreetReportApi[];

  //street issues reported during the ride
  issues: RideDetailIssueApi[];
}

/* =========================
 * API
 * ========================= */
export async function getRideDetail(
  rideId: string
): Promise<RideDetailApiResponse> {
  return api.get<RideDetailApiResponse>(`/api/rides/${rideId}`);
}
