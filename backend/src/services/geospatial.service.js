// Earth's radius in meters
export const EARTH_RADIUS_METERS = 6371000;

// Configurable radius for duplicate candidate search (default: 100 meters)
export const DUPLICATE_RADIUS_METERS = 100;

/**
 * Calculate the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in meters (rounded to 2 decimal places)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const phi1 = (Number(lat1) * Math.PI) / 180;
  const phi2 = (Number(lat2) * Math.PI) / 180;
  const deltaPhi = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const deltaLambda = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Check if two points are within the configured duplicate radius.
 */
export function isWithinRadius(lat1, lon1, lat2, lon2, radiusMeters = DUPLICATE_RADIUS_METERS) {
  const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  return {
    withinRadius: distance <= radiusMeters,
    distanceMeters: distance,
  };
}

/**
 * Filter an array of candidate reports to only those within the specified radius.
 */
export function filterCandidatesByRadius(
  queryLat,
  queryLon,
  candidates,
  radiusMeters = DUPLICATE_RADIUS_METERS
) {
  if (queryLat == null || queryLon == null) return [];

  return candidates
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => {
      const distance = calculateHaversineDistance(queryLat, queryLon, c.latitude, c.longitude);
      return {
        ...c,
        distance_meters: distance,
        is_within_radius: distance <= radiusMeters,
      };
    })
    .filter((c) => c.is_within_radius)
    .sort((a, b) => a.distance_meters - b.distance_meters);
}
