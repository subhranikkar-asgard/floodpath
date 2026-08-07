import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  decodePolyline,
  parseOSRMRoute,
  fetchAlternativeRoutes,
  clearRouteCache,
} from '../lib/routing';

// ── 1. Unit Tests: decodePolyline ─────────────────────────────────────────────

describe('decodePolyline', () => {
  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('correctly decodes a known Google polyline string', () => {
    // Known encoded polyline: represents (38.5, -120.2) → (40.7, -120.95) → (43.252, -126.453)
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const result = decodePolyline(encoded);
    expect(result).toHaveLength(3);
    expect(result[0][0]).toBeCloseTo(38.5, 1);
    expect(result[0][1]).toBeCloseTo(-120.2, 1);
    expect(result[1][0]).toBeCloseTo(40.7, 1);
    expect(result[1][1]).toBeCloseTo(-120.95, 1);
    expect(result[2][0]).toBeCloseTo(43.252, 1);
    expect(result[2][1]).toBeCloseTo(-126.453, 1);
  });

  it('returns an array of [lat, lon] tuples', () => {
    const encoded = '_p~iF~ps|U';
    const result = decodePolyline(encoded);
    expect(result[0]).toHaveLength(2);
    expect(typeof result[0][0]).toBe('number');
    expect(typeof result[0][1]).toBe('number');
  });
});

// ── 2. Unit Tests: parseOSRMRoute ─────────────────────────────────────────────

describe('parseOSRMRoute', () => {
  const mockRoute = {
    geometry: '_p~iF~ps|U_ulLnnqC', // 2-point polyline
    duration: 1800, // 30 minutes in seconds
    distance: 12500, // 12.5 km in meters
    legs: [
      {
        steps: [
          {
            maneuver: { type: 'depart', modifier: undefined },
            name: 'Park Street',
            distance: 800,
          },
          {
            maneuver: { type: 'turn', modifier: 'left' },
            name: 'Chowringhee Road',
            distance: 4000,
          },
          {
            maneuver: { type: 'arrive', modifier: undefined },
            name: '',
            distance: 0,
          },
        ],
      },
    ],
  };

  it('converts duration from seconds to minutes', () => {
    const result = parseOSRMRoute(mockRoute);
    expect(result.duration).toBe(30);
  });

  it('converts distance from meters to km string', () => {
    const result = parseOSRMRoute(mockRoute);
    expect(result.distance).toBe('12.5');
  });

  it('derives summary from the longest named step', () => {
    const result = parseOSRMRoute(mockRoute);
    // Chowringhee Road has distance 4000 vs Park Street 800
    expect(result.summary).toBe('via Chowringhee Road');
  });

  it('falls back to "Local roads" when no named steps exist', () => {
    const unnamedRoute = {
      ...mockRoute,
      legs: [{ steps: [{ maneuver: { type: 'depart' }, name: '', distance: 100 }] }],
    };
    const result = parseOSRMRoute(unnamedRoute);
    expect(result.summary).toBe('Local roads');
  });

  it('decodes geometry into coordinate pairs', () => {
    const result = parseOSRMRoute(mockRoute);
    expect(result.coords.length).toBeGreaterThan(0);
    expect(result.coords[0]).toHaveLength(2);
  });

  it('parses step instructions correctly', () => {
    const result = parseOSRMRoute(mockRoute);
    expect(result.steps[0].instruction).toContain('depart');
    expect(result.steps[0].instruction).toContain('Park Street');
  });

  it('correctly captures left/right modifiers', () => {
    const result = parseOSRMRoute(mockRoute);
    expect(result.steps[1].modifier).toBe('left');
    expect(result.steps[1].type).toBe('turn');
  });

  it('returns empty steps array when legs have no steps', () => {
    const noStepsRoute = { ...mockRoute, legs: [{ steps: [] }] };
    const result = parseOSRMRoute(noStepsRoute);
    expect(result.steps).toEqual([]);
  });
});

// ── 3. Integration Tests: fetchAlternativeRoutes + Cache ──────────────────────

describe('fetchAlternativeRoutes', () => {
  const mockOSRMResponse = {
    code: 'Ok',
    routes: [
      {
        geometry: '_p~iF~ps|U',
        duration: 900,
        distance: 5000,
        legs: [{ steps: [{ maneuver: { type: 'depart' }, name: 'MG Road', distance: 5000 }] }],
      },
      {
        geometry: '_p~iF~ps|U_ulLnnqC',
        duration: 1200,
        distance: 6500,
        legs: [{ steps: [{ maneuver: { type: 'depart' }, name: 'AJC Bose Road', distance: 6500 }] }],
      },
    ],
  };

  beforeEach(() => {
    clearRouteCache();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockOSRMResponse,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns multiple parsed routes from OSRM response', async () => {
    const result = await fetchAlternativeRoutes([22.5726, 88.3639], [22.5448, 88.3426]);
    expect(result).toHaveLength(2);
  });

  it('converts route durations to minutes', async () => {
    const result = await fetchAlternativeRoutes([22.5726, 88.3639], [22.5448, 88.3426]);
    expect(result[0].duration).toBe(15); // 900s = 15 min
    expect(result[1].duration).toBe(20); // 1200s = 20 min
  });

  it('caches routes and does not call fetch twice for same coordinates', async () => {
    await fetchAlternativeRoutes([22.5726, 88.3639], [22.5448, 88.3426]);
    await fetchAlternativeRoutes([22.5726, 88.3639], [22.5448, 88.3426]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('calls different cache keys for different destinations', async () => {
    await fetchAlternativeRoutes([22.5726, 88.3639], [22.5448, 88.3426]);
    await fetchAlternativeRoutes([22.5726, 88.3639], [22.6, 88.4]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('throws an error when the OSRM server returns a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));
    await expect(
      fetchAlternativeRoutes([22.5726, 88.3639], [22.5448, 88.3426])
    ).rejects.toThrow('OSRM error: 500');
  });

  it('throws an error when OSRM returns no routes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'Ok', routes: [] }),
    }));
    await expect(
      fetchAlternativeRoutes([22.5726, 88.3639], [22.5448, 88.3426])
    ).rejects.toThrow('No routes found');
  });
});
