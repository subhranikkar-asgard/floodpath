/**
 * Base URL for OSRM public API routing.
 */
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

/**
 * In-memory cache to prevent redundant API calls for identical routes,
 * significantly improving efficiency and reducing latency.
 */
const routeCache = new Map<string, RouteResult[]>();

/** Clears the in-memory route cache. Exported for testing purposes. */
export function clearRouteCache(): void {
  routeCache.clear();
}

// ── Strict TypeScript interfaces for the OSRM API response ──────────────────

interface OSRMManeuver {
  type: string;
  modifier?: string;
}

interface OSRMStep {
  maneuver: OSRMManeuver;
  name: string;
  distance: number;
}

interface OSRMLeg {
  steps: OSRMStep[];
}

interface OSRMRoute {
  geometry: string;
  duration: number;
  distance: number;
  legs: OSRMLeg[];
}

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Decodes a Google-encoded polyline string into an array of [lat, lon] tuples.
 * @param encoded - The encoded polyline string from the OSRM API.
 * @returns Array of coordinate pairs.
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lon = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lon / 1e5]);
  }
  return points;
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  modifier?: string; // left, right, straight, u-turn, etc.
  type?: string;     // turn, new name, depart, arrive, etc.
  name?: string;     // road name
}

export interface RouteResult {
  coords: [number, number][];
  duration: number;   // minutes
  distance: string;   // km string
  summary: string;    // e.g., "via Park Street"
  color?: string;
  steps: RouteStep[];
  lowestElevation?: number; // meters above sea level
}

// ── Route parsing helper ─────────────────────────────────────────────────────

/**
 * Parses a single raw OSRM route into a typed RouteResult.
 * Exported for unit testing.
 */
export function parseOSRMRoute(r: OSRMRoute): RouteResult {
  const steps: RouteStep[] = r.legs[0]?.steps?.map((step: OSRMStep) => ({
    instruction: `${step.maneuver.type}${step.maneuver.modifier ? " " + step.maneuver.modifier : ""}${step.name ? " onto " + step.name : ""}`.trim(),
    distance: Math.round(step.distance),
    modifier: step.maneuver.modifier,
    type: step.maneuver.type,
    name: step.name || undefined,
  })) ?? [];

  // Derive a summary from the longest named road segment
  let summary = "Local roads";
  const namedSteps = steps.filter(s => s.name && s.name.length > 0);
  if (namedSteps.length > 0) {
    const longestStep = namedSteps.reduce((prev, current) =>
      prev.distance > current.distance ? prev : current
    );
    summary = `via ${longestStep.name}`;
  }

  return {
    coords:   decodePolyline(r.geometry),
    duration: Math.round(r.duration / 60),
    distance: (r.distance / 1000).toFixed(1),
    summary,
    steps,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches alternative driving routes between two coordinates using OSRM.
 * Implements an in-memory cache for efficiency and parses turn-by-turn navigation steps.
 *
 * @param origin - Tuple of [latitude, longitude]
 * @param destination - Tuple of [latitude, longitude]
 * @returns Array of parsed route results sorted by OSRM's internal optimal heuristic.
 */
export async function fetchAlternativeRoutes(
  origin: [number, number],
  destination: [number, number],
  mode: "driving" | "foot" = "driving"
): Promise<RouteResult[]> {
  const [oLat, oLon] = origin;
  const [dLat, dLon] = destination;

  const cacheKey = `${mode}-${oLat},${oLon}-${dLat},${dLon}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  const baseUrl = mode === "foot" ? "https://router.project-osrm.org/route/v1/foot" : OSRM_BASE;
  const url = `${baseUrl}/${oLon},${oLat};${dLon},${dLat}?overview=full&geometries=polyline&alternatives=true&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status} ${res.statusText}`);

  const json: OSRMResponse = await res.json();
  if (!json.routes?.length) throw new Error("No routes found");

  const parsedRoutes = json.routes.map(parseOSRMRoute);

  // Fetch elevation and precipitation data for routes to calculate dynamic Pan-India risk
  try {
    // Sample a few points from each route to avoid URI too long errors
    const allSampledPoints = parsedRoutes.flatMap(route => {
      const step = Math.max(1, Math.floor(route.coords.length / 10)); // Sample ~10 points per route
      return route.coords.filter((_, i) => i % step === 0);
    });
    
    if (allSampledPoints.length > 0) {
      const lats = allSampledPoints.map(p => p[0].toFixed(4)).join(",");
      const lons = allSampledPoints.map(p => p[1].toFixed(4)).join(",");
      
      // Fetch elevation
      const elevRes = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`);
      // Fetch precipitation (current)
      const precipRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=precipitation`);
      
      if (elevRes.ok && precipRes.ok) {
        const elevData = await elevRes.json();
        const precipData = await precipRes.json();
        
        if (elevData.elevation && elevData.elevation.length === allSampledPoints.length) {
          let globalIndex = 0;
          parsedRoutes.forEach((route, rIndex) => {
            const numSamples = Math.floor(route.coords.length / Math.max(1, Math.floor(route.coords.length / 10))) + (route.coords.length % Math.max(1, Math.floor(route.coords.length / 10)) === 0 ? 0 : 1);
            
            const routeElevations = elevData.elevation.slice(globalIndex, globalIndex + numSamples);
            // Open-Meteo returns array of responses when querying multiple coordinates for forecast
            let hasRiskySegment = false;
            
            for (let i = 0; i < numSamples; i++) {
               const elev = routeElevations[i];
               // Precipitation data structure for multiple points is an array of objects
               const precip = precipData[globalIndex + i]?.current?.precipitation || 0;
               
               // Dynamic Risk Algorithm: Low elevation (< 10m) + Heavy rain (> 2mm)
               if (elev < 10 && precip > 2) {
                 hasRiskySegment = true;
               }
            }
            
            globalIndex += numSamples;
            route.lowestElevation = Math.min(...routeElevations);
            
            // Override route color based on dynamic risk
            if (hasRiskySegment) {
              route.color = "#ef4444"; // Risky red
              route.summary += " (⚠️ High Waterlogging Risk Detected)";
            } else {
              route.color = "#22c55e"; // Safe green
            }
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch dynamic risk data", e);
  }

  routeCache.set(cacheKey, parsedRoutes);
  return parsedRoutes;
}

/**
 * Geocodes a place name to coordinates using the Nominatim API,
 * biased towards the Kolkata bounding box.
 *
 * @param query - The place name to search for.
 * @returns Array of matching locations with name, lat, lon.
 */
export async function searchPlace(query: string): Promise<{ name: string; lat: number; lon: number }[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const json: NominatimResult[] = await res.json();
  return json.map(r => ({
    name: r.display_name,
    lat:  parseFloat(r.lat),
    lon:  parseFloat(r.lon),
  }));
}
