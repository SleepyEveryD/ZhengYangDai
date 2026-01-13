export type Route = {
    id: string;
    name: string;
    distance: number;
    duration: number;
    rating: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    path: [number, number][];
    elevation: number[];
    segments: {
      condition: 'excellent' | 'good' | 'fair' | 'poor';
      distance: number;
      description: string;
    }[];
    comments: {
      user: string;
      date: string;
      content: string;
      rating: number;
    }[];
  };
  