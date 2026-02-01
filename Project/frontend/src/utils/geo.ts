
//selected path point to find nearest path index
export function findNearestPathIndex(
  path: [number, number][],
  point: [number, number]
) {
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < path.length; i++) {
    const dLat = path[i][0] - point[0];
    const dLng = path[i][1] - point[1];
    const dist = dLat * dLat + dLng * dLng; // squared distance
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  return { index: bestIndex, distance2: bestDist };
}



