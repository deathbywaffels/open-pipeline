import { describe, it, expect } from "@jest/globals";
import {
  haversineDistanceKm,
  isInDesiredLocation,
} from "./locationMatch.service.js";

describe("haversineDistanceKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineDistanceKm(52.37, 4.9, 52.37, 4.9)).toBe(0);
  });

  it("returns ~111km for one degree of latitude apart", () => {
    // 1 degree of latitude is ~111.2km everywhere on Earth — a reliable
    // sanity check independent of any specific real-world city pair.
    const distance = haversineDistanceKm(0, 0, 1, 0);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });
});

describe("isInDesiredLocation", () => {
  const amsterdam = { latitude: 52.3676, longitude: 4.9041 };
  const nearbyHaarlem = { latitude: 52.3874, longitude: 4.6462 }; // ~18km from Amsterdam
  const farRotterdam = { latitude: 51.9244, longitude: 4.4777 }; // ~57km from Amsterdam

  it("returns null when the job has no coordinates", () => {
    expect(isInDesiredLocation(null, null, [amsterdam], 50)).toBeNull();
  });

  it("returns null when there are no desired locations", () => {
    expect(isInDesiredLocation(52.37, 4.9, [], 50)).toBeNull();
  });

  it("returns null when no desired location successfully geocoded", () => {
    const ungeocoded = { latitude: null, longitude: null };
    expect(isInDesiredLocation(52.37, 4.9, [ungeocoded], 50)).toBeNull();
  });

  it("returns true when within the radius of a desired location", () => {
    expect(
      isInDesiredLocation(
        nearbyHaarlem.latitude,
        nearbyHaarlem.longitude,
        [amsterdam],
        50,
      ),
    ).toBe(true);
  });

  it("returns false when outside the radius of every desired location", () => {
    expect(
      isInDesiredLocation(
        farRotterdam.latitude,
        farRotterdam.longitude,
        [amsterdam],
        50,
      ),
    ).toBe(false);
  });

  it("returns true if within range of any desired location, not just the first", () => {
    const ungeocoded = { latitude: null, longitude: null };
    expect(
      isInDesiredLocation(
        farRotterdam.latitude,
        farRotterdam.longitude,
        [ungeocoded, farRotterdam],
        10,
      ),
    ).toBe(true);
  });
});
