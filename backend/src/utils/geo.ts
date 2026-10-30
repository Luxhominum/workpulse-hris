/**
 * Calculate distance between two coordinates in meters using the Haversine formula
 *
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in meters rounded to 2 decimal places
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_METERS = 6371000; // Mean Earth radius in meters

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Check if a location is within an office's designated perimeter radius
 */
export function isWithinPerimeter(
  userLat: number,
  userLng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number
): { isInside: boolean; distanceMeters: number } {
  const distanceMeters = calculateDistance(userLat, userLng, officeLat, officeLng);
  return {
    isInside: distanceMeters <= radiusMeters,
    distanceMeters,
  };
}
