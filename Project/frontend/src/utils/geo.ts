/*地图点选路径*/

function haversineMeters(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function findNearestPathIndex(
  path: [number, number][],
  point: [number, number]
) {
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < path.length; i++) {
    const dLat = path[i][0] - point[0];
    const dLng = path[i][1] - point[1];
    const dist = dLat * dLat + dLng * dLng; // ✅ 用平方距离就够了（不用开根号更快）
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  return { index: bestIndex, distance2: bestDist };
}



