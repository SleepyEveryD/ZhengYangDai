import api from "../lib/api";

export interface ProfileSummary {
  ridesCount: number;
  reportsCount: number;
}

export async function getProfileSummary(): Promise<ProfileSummary> {
  const res = await api.get<ProfileSummary>("/api/profile");
  return res.data;
}
