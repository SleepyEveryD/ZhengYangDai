/**
 * Normalize frontend location input to GeoJSON Point
 *
 * Frontend format:
 *   [lat, lng]
 *
 * GeoJSON format:
 *   { type: "Point", coordinates: [lng, lat] }
 */
 export type GeoJSONPoint = {
    type: 'Point';
    coordinates: [number, number];
  };
  
  export function toGeoJSONPointFromFrontend(input: any): GeoJSONPoint | null {
    if (!input) return null;
  
    // Frontend format: [lat, lng]
    if (
      Array.isArray(input) &&
      input.length === 2 &&
      typeof input[0] === 'number' &&
      typeof input[1] === 'number'
    ) {
      const [lat, lng] = input;
  
      return {
        type: 'Point',
        coordinates: [lng, lat], // ⚠️ GeoJSON 坐标顺序
      };
    }
  
    return null;
  }
  