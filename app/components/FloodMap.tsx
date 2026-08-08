"use client";
import { useEffect, useRef, useState } from "react";
import type { RouteResult } from "@/lib/routing";
import { kolkataFloodZones, RISK_COLORS } from "@/data/flood_zones_geo";

interface Props {
  userLocation: { lat: number; lon: number } | null;
  destination:  { lat: number; lon: number; name: string } | null;
  routes:       RouteResult[];
  activeIndex:  number;
  routeStatus:  "safe" | "all_risky" | null;
  isNavigating: boolean;
  onSelectRoute?: (index: number) => void;
}

export default function FloodMap({ userLocation, destination, routes = [], activeIndex = 0, routeStatus, isNavigating = false, onSelectRoute }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const layersRef    = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const reportsLayersRef = useRef<any[]>([]);

  const [reportMode, setReportMode] = useState(false);
  const [reports, setReports] = useState<{lat: number, lon: number, id: number}[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("flood_reports");
    if (saved) setReports(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    import("leaflet").then((L) => {
      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
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
          
          if (!isNavigating) {
            map.fitBounds(L.latLngBounds(route.coords), { padding: [60, 60] });
          }
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
  }, [destination, routes, activeIndex, routeStatus, isNavigating, onSelectRoute]);

  // Separate effect specifically for the live user location marker to avoid redrawing everything
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    
    import("leaflet").then((L) => {
      const map = mapRef.current!;

      if (!userMarkerRef.current) {
        // Create it the first time
        const icon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:20px;height:20px;">
              <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.3);animation:pulse 2s infinite"></div>
              <div style="position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>
            </div>
            <style>@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }</style>
          `,
          iconSize:   [20, 20],
          iconAnchor: [10, 10],
        });
        const m = L.marker([userLocation.lat, userLocation.lon], { icon });
        m.addTo(map);
        userMarkerRef.current = m;
      } else {
        // Just update its coordinates smoothly
        const m = userMarkerRef.current as any;
        m.setLatLng([userLocation.lat, userLocation.lon]);
      }

      // If we are navigating, keep the map centered on the user
      if (isNavigating) {
        map.setView([userLocation.lat, userLocation.lon], 16, { animate: true });
      } else if (!destination && routes.length === 0) {
        // Only set view to user on load if no routes are drawn
        map.setView([userLocation.lat, userLocation.lon], 13, { animate: true });
      }
    });
  }, [userLocation, isNavigating, destination, routes.length]);

  // Handle map clicks for report mode dynamically
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const onClick = (e: any) => {
      if (!reportMode) return;
      const newReport = { lat: e.latlng.lat, lon: e.latlng.lng, id: Date.now() };
      const updated = [...reports, newReport];
      setReports(updated);
      localStorage.setItem("flood_reports", JSON.stringify(updated));
      setReportMode(false); // turn off after 1 click
    };
    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [reportMode, reports]);

  // Render report markers
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      const map = mapRef.current!;
      reportsLayersRef.current.forEach(l => map.removeLayer(l));
      reportsLayersRef.current = [];
      
      reports.forEach(r => {
        const icon = L.divIcon({
          html: `<div style="font-size: 20px; background: rgba(239,68,68,0.2); border-radius: 50%; padding: 4px; box-shadow: 0 0 10px rgba(239,68,68,0.5);">🚨</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([r.lat, r.lon], { icon }).addTo(map);
        reportsLayersRef.current.push(marker);
      });
    });
  }, [reports]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", background: "#0f172a", cursor: reportMode ? "crosshair" : "grab" }}
        aria-label="Kolkata flood risk map"
      />
      {/* Report Button */}
      {!isNavigating && (
        <button
          onClick={() => setReportMode(!reportMode)}
          style={{
            position: "absolute", bottom: "30px", left: "50%", transform: "translateX(-50%)", zIndex: 1000,
            background: reportMode ? "#ef4444" : "rgba(15,23,42,0.8)",
            color: "white", padding: "10px 20px", borderRadius: "100px",
            border: `1px solid ${reportMode ? "#b91c1c" : "rgba(255,255,255,0.2)"}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)", fontWeight: 600, fontSize: "14px", cursor: "pointer",
            backdropFilter: "blur(8px)"
          }}
        >
          {reportMode ? "Tap map to report flood 📍" : "🚨 Report Flood"}
        </button>
      )}
    </div>
  );
}
