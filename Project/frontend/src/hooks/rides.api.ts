import api from "../lib/api";

export interface RideListIssue {
  id: string;
  issueType: string;
  createdAt: string;
}

export interface RideListItem {
  id: string;
  startedAt: string;
  endedAt: string;
  issues: RideListIssue[]; // ✅ 新增
}

export interface RideListResponse {
  items: RideListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export async function getMyRides(
  page = 1,
  limit = 20
): Promise<RideListResponse> {
  const res = await api.get<RideListResponse>("/rides", {
    params: { page, limit },
  });
  return res.data;
}
