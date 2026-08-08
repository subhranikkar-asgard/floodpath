"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RouteResult } from "@/lib/routing";
import { supabase } from "@/lib/supabase";

interface Props {
  userLocation: { lat: number; lon: number; heading?: number | null } | null;
  destination:  { lat: number; lon: number; name: string } | null;
  routes:       RouteResult[];
  activeIndex:  number;
  routeStatus:  "safe" | "all_risky" | null;
  isNavigating: boolean;
  onSelectRoute?: (index: number) => void;
}

export default function FloodMap({ userLocation, destination, routes = [], activeIndex = 0, routeStatus, isNavigating = false, onSelectRoute }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const reportMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [reportMode, setReportMode] = useState(false);
  const [reports, setReports] = useState<{lat: number, lon: number, id: number}[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Fetch Supabase Reports
  useEffect(() => {
    async function loadReports() {
      const { data, error } = await supabase.from("flood_reports").select("*");
      if (!error && data) {
        setReports(data.map(d => ({ id: d.id, lat: d.lat, lon: d.lon })));
      }
    }
    loadReports();

    const channel = supabase.channel("public:flood_reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "flood_reports" }, (payload) => {
        setReports(prev => [...prev, payload.new as any]);
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); }
  }, []);

  // 2. Initialize MapLibre Engine
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;

    const center: [number, number] = userLocation
      ? [userLocation.lon, userLocation.lat] // MapLibre uses [lng, lat]
      : [79.0882, 21.1458];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
          }
        },
        layers: [
          {
            id: "carto-dark-layer",
            type: "raster",
            source: "carto-dark",
            paint: { "raster-fade-duration": 0 }
          }
        ]
      },
      center,
      zoom: userLocation ? 13 : 4,
      pitch: 60, // 3D Tilt!
      bearing: -15, // Slight rotation for premium feel
      attributionControl: false
    });

    map.on('load', () => {
      setMapLoaded(true);
      
      // Intro fly animation
      if (userLocation) {
        map.flyTo({
          center: [userLocation.lon, userLocation.lat],
          zoom: 14,
          speed: 1.2,
          curve: 1.42,
          easing: (t: number) => t,
          essential: true
        });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // 3. User Location Marker Update
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    const map = mapRef.current;
    const lngLat: [number, number] = [userLocation.lon, userLocation.lat];

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'user-marker';
      el.innerHTML = `
        <div style="position:relative;width:24px;height:24px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(56,189,248,0.4);animation:pulse 2s infinite"></div>
          <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:#0ea5e9;border:3px solid white;box-shadow:0 0 15px rgba(14,165,233,0.8)"></div>
        </div>
        <style>@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }</style>
      `;
      userMarkerRef.current = new maplibregl.Marker(el).setLngLat(lngLat).addTo(map);
    } else {
      userMarkerRef.current.setLngLat(lngLat);
    }

    if (isNavigating) {
      map.easeTo({ center: lngLat, pitch: 60, bearing: map.getBearing(), zoom: 17, duration: 1000 });
    }
  }, [userLocation, isNavigating]);

  // 4. Routes Drawing
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (routes.length === 0) {
      // Clear routes if none exist
      for (let i = 0; i < 20; i++) {
        if (map.getLayer(`route-glow-${i}`)) map.removeLayer(`route-glow-${i}`);
        if (map.getLayer(`route-line-${i}`)) map.removeLayer(`route-line-${i}`);
        if (map.getSource(`route-source-${i}`)) map.removeSource(`route-source-${i}`);
      }
      return;
    }

    // We draw inactive routes first, then active
    const drawOrder = routes.map((r, i) => i).sort((a, b) => (a === activeIndex ? 1 : -1));

    drawOrder.forEach(idx => {
      const route = routes[idx];
      const isActive = idx === activeIndex;
      const color = isActive ? (routeStatus === "safe" ? "#10b981" : "#f43f5e") : "#475569";
      
      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: route.coords.map(c => [c[1], c[0]]) // Leaflet is [lat, lng], GeoJSON is [lng, lat]
        }
      };

      const sourceId = `route-source-${idx}`;
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
      
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource(sourceId, { type: "geojson", data: geojson });
      }

      // Remove existing layers to recreate them with proper z-index and properties
      if (map.getLayer(`route-glow-${idx}`)) map.removeLayer(`route-glow-${idx}`);
      if (map.getLayer(`route-line-${idx}`)) map.removeLayer(`route-line-${idx}`);

      if (isActive) {
        // Glow effect
        map.addLayer({
          id: `route-glow-${idx}`,
          type: "line",
          source: sourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": color,
            "line-width": 14,
            "line-opacity": 0.3,
            "line-blur": 10
          }
        });
      }

      const paintProps: any = {
        "line-color": color,
        "line-width": isActive ? 6 : 4,
        "line-opacity": isActive ? 1 : 0.6,
      };
      if (!isActive) {
        paintProps["line-dasharray"] = [2, 2];
      }

      map.addLayer({
        id: `route-line-${idx}`,
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: paintProps
      });
    });

    // Clean up any lingering layers from a previous state that had more routes
    for (let i = routes.length; i < 20; i++) {
      if (map.getLayer(`route-glow-${i}`)) map.removeLayer(`route-glow-${i}`);
      if (map.getLayer(`route-line-${i}`)) map.removeLayer(`route-line-${i}`);
      if (map.getSource(`route-source-${i}`)) map.removeSource(`route-source-${i}`);
    }

    if (!isNavigating && routes.length > 0) {
      const activeRoute = routes[activeIndex];
      const lats = activeRoute.coords.map(c => c[0]);
      const lons = activeRoute.coords.map(c => c[1]);
      const bounds = new maplibregl.LngLatBounds(
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)]
      );
      map.fitBounds(bounds, { padding: 80, pitch: 45 });
    }

  }, [routes, activeIndex, routeStatus, mapLoaded, isNavigating]);

  // Dynamic Camera Tracking during navigation
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !isNavigating || !userLocation) return;
    const map = mapRef.current;

    map.easeTo({
      center: [userLocation.lon, userLocation.lat],
      pitch: 60,
      zoom: 18.5,
      bearing: userLocation.heading || 0,
      duration: 1000,
      easing: (t) => t * (2 - t) // easeOutQuad
    });
  }, [userLocation, isNavigating, mapLoaded]);

  // 5. Destination & 3. User Marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !userLocation) return;
    const map = mapRef.current;
    
    if (userMarkerRef.current) userMarkerRef.current.remove();
    
    const el = document.createElement('div');
    if (isNavigating) {
      // Navigation Arrow Pointer
      const heading = userLocation.heading || 0;
      el.innerHTML = `<div style="width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:30px solid #3b82f6;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.5));transform:rotate(${heading}deg);"></div>`;
    } else {
      // Standard glowing dot
      el.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 16px rgba(59,130,246,0.8)"></div>`;
    }

    userMarkerRef.current = new maplibregl.Marker(el)
      .setLngLat([userLocation.lon, userLocation.lat])
      .addTo(map);

  }, [userLocation, mapLoaded, isNavigating]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (destMarkerRef.current) destMarkerRef.current.remove();
    if (destination) {
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#8b5cf6,#d946ef);border:3px solid white;transform:rotate(-45deg);box-shadow:0 8px 16px rgba(217,70,239,0.5)"></div>`;
      destMarkerRef.current = new maplibregl.Marker(el)
        .setLngLat([destination.lon, destination.lat])
        .addTo(map);
    }

    reportMarkersRef.current.forEach(m => m.remove());
    reportMarkersRef.current = [];

    reports.forEach(r => {
      const el = document.createElement('div');
      el.innerHTML = `<div style="font-size: 22px; filter: drop-shadow(0 0 10px rgba(239,68,68,0.8));">🚨</div>`;
      const m = new maplibregl.Marker(el).setLngLat([r.lon, r.lat]).addTo(map);
      reportMarkersRef.current.push(m);
    });

  }, [destination, reports, mapLoaded]);

  // 6. Click to Report
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const onClick = async (e: maplibregl.MapMouseEvent) => {
      if (!reportMode) return;
      setReportMode(false);
      
      const newReport = { lat: e.lngLat.lat, lon: e.lngLat.lng };
      setReports(prev => [...prev, { ...newReport, id: Date.now() }]);
      await supabase.from("flood_reports").insert(newReport);
    };

    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [reportMode, mapLoaded]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", background: "#0f172a", cursor: reportMode ? "crosshair" : "grab" }}
      />
      {!isNavigating && (
        <button
          onClick={() => setReportMode(!reportMode)}
          style={{
            position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 10,
            background: reportMode ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "rgba(15,23,42,0.85)",
            color: "white", padding: "12px 24px", borderRadius: "100px",
            border: `1px solid ${reportMode ? "#f87171" : "rgba(255,255,255,0.2)"}`,
            boxShadow: reportMode ? "0 8px 24px rgba(239,68,68,0.5)" : "0 4px 12px rgba(0,0,0,0.5)", 
            fontWeight: 700, fontSize: "14px", cursor: "pointer",
            backdropFilter: "blur(12px)", transition: "all 0.3s ease"
          }}
        >
          {reportMode ? "Tap map to drop pin 📍" : "🚨 Report Flood"}
        </button>
      )}
    </div>
  );
}
