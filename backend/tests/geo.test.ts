import { describe, it, expect } from 'vitest';
import { calculateDistance, isWithinPerimeter } from '../src/utils/geo';

describe('Haversine Geofencing Engine', () => {
  // Test coordinates:
  // Monas (Jakarta): -6.175392, 106.827153
  // Grand Indonesia (Jakarta): -6.195000, 106.821000 (~2.2 km away)
  const monasLat = -6.175392;
  const monasLng = 106.827153;

  it('should return 0 meters for identical coordinates', () => {
    const distance = calculateDistance(monasLat, monasLng, monasLat, monasLng);
    expect(distance).toBe(0);
  });

  it('should calculate accurate distance between two nearby coordinates', () => {
    // Offset ~111 meters (approx 0.001 degree latitude)
    const nearbyLat = monasLat + 0.001;
    const distance = calculateDistance(monasLat, monasLng, nearbyLat, monasLng);

    // 0.001 degree latitude is approx 111.19 meters
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(113);
  });

  it('should identify coordinates inside office perimeter', () => {
    // 30 meters away offset
    const userLat = monasLat + 0.0002;
    const userLng = monasLng + 0.0001;

    const result = isWithinPerimeter(userLat, userLng, monasLat, monasLng, 100);
    expect(result.isInside).toBe(true);
    expect(result.distanceMeters).toBeLessThan(100);
  });

  it('should identify coordinates outside office perimeter', () => {
    // ~2.2 km away
    const giLat = -6.195;
    const giLng = 106.821;

    const result = isWithinPerimeter(giLat, giLng, monasLat, monasLng, 100);
    expect(result.isInside).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(2000);
  });
});
