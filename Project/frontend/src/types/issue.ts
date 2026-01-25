export type IssueType =
  | 'NONE'
  | 'POTHOLE'
  | 'BUMP'
  | 'GRAVEL'
  | 'CONSTRUCTION'
  | 'OTHER';


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

