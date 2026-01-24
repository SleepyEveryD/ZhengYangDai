export type RouteCondition = 'excellent' | 'good' | 'fair' | 'poor';

export type RouteSegment = {
  condition: RouteCondition;
  distance: number;
  description: string;
};

export type RouteComment = {
  user: string;
  date: string;
  content: string;
  rating: number;
};

export type Route = {
  id: string;
  name: string;
  distance: number;
  duration: number;
  rating: number;
  condition: RouteCondition;
  path: [number, number][];
  elevation: number[];
  segments: RouteSegment[];
  comments: RouteComment[];
};