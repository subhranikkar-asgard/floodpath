"use client";
import { useEffect, useRef } from "react";
import type { RouteResult } from "@/lib/routing";
import { kolkataFloodZones, RISK_COLORS } from "@/data/flood_zones_geo";

interface Props {
  userLocation: { lat: number; lon: number } | null;
  destination:  { lat: number; lon: number; name: string } | null;
  routes:       RouteResult[];
  activeIndex:  number;
  routeStatus:  "safe" | "all_risky" | null;
  onSelectRoute?: (index: number) => void;
}

export default function FloodMap({ userLocation, destination, routes, activeIndex, routeStatus, onSelectRoute }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);
  const layersRef    = useRef<unknown[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    import("leaflet").then((L) => {
      // Fix default icon
      // @ts-expect-error leaflet internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) {
        const center: [number, number] = userLocation
          ? [userLocation.lat, userLocation.lon]
          : [22.5726, 88.3639];

        mapRef.current = L.map(containerRef.current!, {
          center,
          zoom: 12,
          zoomControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://openstreetmap.org">OSM</a>',
        }).addTo(mapRef.current);

        L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

        // Draw flood zones
        kolkataFloodZones.features.forEach((feature) => {
          const rl  = feature.properties.riskLevel as keyof typeof RISK_COLORS;
          const col = RISK_COLORS[rl] ?? RISK_COLORS.low;

          const poly = L.geoJSON(feature as GeoJSON.Feature, {
            style: {
              color:       col.stroke,
              fillColor:   col.fill,
              fillOpacity: 0.28,
              weight:      1.5,
            },
          })
          .bindPopup(`<b>${feature.properties.name}</b><br/><span style="color:${col.fill}">${col.label}</span>`)
          .addTo(mapRef.current!);

          (layersRef.current as unknown[]).push(poly);
        });
      }

      const map = mapRef.current;

      // Clear dynamic layers (route + markers)
      (layersRef.current as L.Layer[]).forEach(l => {
        if ((l as { _isRoute?: boolean })._isRoute || (l as { _isMarker?: boolean })._isMarker) {
          map.removeLayer(l);
        }
      });
      layersRef.current = (layersRef.current as L.Layer[]).filter(
        l => !(l as { _isRoute?: boolean })._isRoute && !(l as { _isMarker?: boolean })._isMarker
      );

      // User location marker
      if (userLocation) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
          iconSize:   [16, 16],
          iconAnchor: [8, 8],
        });
        const m = L.marker([userLocation.lat, userLocation.lon], { icon });
        (m as unknown as { _isMarker: boolean })._isMarker = true;
        m.addTo(map).bindPopup("📍 Your location");
        layersRef.current.push(m);
        map.setView([userLocation.lat, userLocation.lon], 13, { animate: true });
      }

      // Destination marker
      if (destination) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:3px solid white;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(99,102,241,0.5)"></div>`,
          iconSize:   [26, 26],
          iconAnchor: [13, 26],
        });
        const m = L.marker([destination.lat, destination.lon], { icon });
        (m as unknown as { _isMarker: boolean })._isMarker = true;
        m.addTo(map).bindPopup(`<b>🎯 Destination</b><br/>${destination.name.split(",")[0]}`);
        layersRef.current.push(m);
      }

      // Draw alternative routes first (so they are underneath)
      routes.forEach((route, idx) => {
        const isActive = idx === activeIndex;
        const color = isActive ? (routeStatus === "safe" ? "#22c55e" : "#f97316") : "#64748b";
        
        // Transparent thick line for click area
        const clickLine = L.polyline(route.coords, { color: "transparent", weight: 30 });
        (clickLine as unknown as { _isRoute: boolean })._isRoute = true;
        clickLine.on("click", () => onSelectRoute && onSelectRoute(idx));
        clickLine.addTo(map);
        layersRef.current.push(clickLine);

        // Visible line
        if (isActive) {
          const glow = L.polyline(route.coords, { color, weight: 12, opacity: 0.2 });
          (glow as unknown as { _isRoute: boolean })._isRoute = true;
          glow.addTo(map);
          layersRef.current.push(glow);

          const line = L.polyline(route.coords, { color, weight: 6, opacity: 0.95 });
          (line as unknown as { _isRoute: boolean })._isRoute = true;
          line.addTo(map);
          layersRef.current.push(line);
          
          map.fitBounds(L.latLngBounds(route.coords), { padding: [60, 60] });
        } else {
          const line = L.polyline(route.coords, { color, weight: 5, opacity: 0.7, dashArray: "5, 8" });
          (line as unknown as { _isRoute: boolean })._isRoute = true;
          line.addTo(map);
          layersRef.current.push(line);
        }

        // Add duration bubble on the route
        if (route.coords.length > 0) {
          const midPoint = route.coords[Math.floor(route.coords.length / 2)];
          const iconHtml = `<div style="
            background: ${isActive ? (routeStatus === "safe" ? "#166534" : "#9a3412") : "#334155"};
            color: white;
            padding: 4px 10px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: bold;
            border: 2px solid ${isActive ? color : "#64748b"};
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            white-space: nowrap;
            cursor: pointer;
          ">${route.duration} min</div>`;
          
          const icon = L.divIcon({ html: iconHtml, className: "", iconSize: [0, 0], iconAnchor: [30, 15] });
          const marker = L.marker(midPoint, { icon });
          marker.on("click", () => onSelectRoute && onSelectRoute(idx));
          marker.addTo(map);
          layersRef.current.push(marker);
        }
      });
    });

    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      if (mapRef.current && !containerRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userLocation, destination, routes, activeIndex, routeStatus, onSelectRoute]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", background: "#0f172a" }}
        aria-label="Kolkata flood risk map"
      />
    </>
  );
}
