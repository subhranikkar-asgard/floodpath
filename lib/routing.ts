const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

function decodePolyline(encoded: string): [number, number][] {
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

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  modifier?: string; // left, right, straight, u-turn, etc.
  type?: string;     // turn, new name, depart, arrive, etc.
}

export interface RouteResult {
  coords: [number, number][];
  duration: number;   // minutes
  distance: string;   // km string
  color?: string;
  steps: RouteStep[];
}

export async function fetchAlternativeRoutes(
  origin: [number, number],
  destination: [number, number]
): Promise<RouteResult[]> {
  const [oLat, oLon] = origin;
  const [dLat, dLon] = destination;
  const url = `${OSRM_BASE}/${oLon},${oLat};${dLon},${dLat}?overview=full&geometries=polyline&alternatives=true&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const json = await res.json();
  if (!json.routes?.length) throw new Error("No routes found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return json.routes.map((r: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: RouteStep[] = r.legs[0]?.steps?.map((step: any) => ({
      instruction: `${step.maneuver.type} ${step.maneuver.modifier ? step.maneuver.modifier : ""} ${step.name ? "onto " + step.name : ""}`.trim(),
      distance: Math.round(step.distance),
      modifier: step.maneuver.modifier,
      type: step.maneuver.type,
    })) || [];

    return {
      coords:   decodePolyline(r.geometry),
      duration: Math.round(r.duration / 60),
      distance: (r.distance / 1000).toFixed(1),
      steps,
    };
  });
}

export async function searchPlace(query: string): Promise<{ name: string; lat: number; lon: number }[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query + " Kolkata")}&viewbox=88.1,22.3,88.6,22.9&bounded=0&limit=5`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const json = await res.json();
  return json.map((r: { display_name: string; lat: string; lon: string }) => ({
    name: r.display_name,
    lat:  parseFloat(r.lat),
    lon:  parseFloat(r.lon),
  }));
}
