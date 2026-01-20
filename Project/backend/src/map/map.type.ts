// src/map/path.type.ts
export type Path = {
  id: string;
  coordinates: [number, number][];
  condition: "good" | "fair" | "poor";
};
