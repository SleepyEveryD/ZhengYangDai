import api from "../lib/api";

export interface RideDetailIssueApi {
  id: string;
  issueType: string;
  locationJson?: {
    coordinates: [number, number];
  };
  createdAt: string;
}

export interface RideDetailApiResponse {
    id: string;
    startedAt: string;
    endedAt: string;
    routeGeoJson?: {
      coordinates: [number, number][];
    };
    issues: {
      id: string;
      issueType: string;
      locationJson?: {
        coordinates: [number, number];
      };
      createdAt: string;
    }[];
  }
  

  export async function getRideDetail(
    rideId: string
  ): Promise<RideDetailApiResponse> {
    return api.get<RideDetailApiResponse>(`/rides/${rideId}`);
  }
  