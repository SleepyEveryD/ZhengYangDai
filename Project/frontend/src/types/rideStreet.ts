export type RideStreet = {
  externalId: string;        // Google / external street id
  name: string;
  city: string | null;
  country: string | null;
  positions: {
    index: number;
    coord: [number, number]; // [lng, lat]
  }[];
  condition: string;
};
