export enum IssueType {
  POTHOLE = "POTHOLE",
  BUMP = "BUMP",
  GRAVEL = "GRAVEL",
  CONSTRUCTION = "CONSTRUCTION",
  OTHER = "OTHER",
}



export type Issue = {
  streetId: string;
  issueType: IssueType;
  location: {
    lat: number;
    lng: number;
  };
  notes?: string;
  createdAt: Date;
};

