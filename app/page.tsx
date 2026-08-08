"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { AssessmentResult } from "@/lib/types";
import type { RouteResult }      from "@/lib/routing";
import RiskCard        from "./components/RiskCard";
import LoadingState    from "./components/LoadingState";
import DisclaimerFooter from "./components/DisclaimerFooter";

// Leaflet must be loaded client-side only
const FloodMap = dynamic(() => import("./components/FloodMap"), { ssr: false,
  loading: () => (
    <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
      background:"rgba(10,15,30,0.8)", color:"var(--text-muted)", fontSize:"13px" }}>
      Loading map…
    </div>
  )
});

/* ── Quick example queries ─────────────────────────────────────────────────── */
const QUICK = [
  { label: "Going from Ultadanga to Park Street — safe?", tag: "Route" },
  { label: "Is Jadavpur okay to travel through?",         tag: "Area"  },
  { label: "Salt Lake Sector V today?",                   tag: "Area"  },
  { label: "What's the capital of France?",               tag: "Off-topic ↗" },
];

const TAG_STYLE: Record<string, React.CSSProperties> = {
  Route:       { background:"rgba(99,102,241,0.15)", color:"rgba(165,180,252,0.9)",  border:"1px solid rgba(99,102,241,0.2)"  },
  Area:        { background:"rgba(14,165,233,0.12)", color:"rgba(125,211,252,0.9)",  border:"1px solid rgba(14,165,233,0.2)"  },
  "Off-topic ↗":{ background:"rgba(148,163,184,0.1)",color:"var(--text-muted)",      border:"1px solid rgba(255,255,255,0.07)"},
};

/* ── Map legend ────────────────────────────────────────────────────────────── */
const LEGEND = [
  { color:"#ef4444", label:"High Risk Zone",     type: "zone" },
  { color:"#f97316", label:"Moderate Risk Zone", type: "zone" },
  { color:"#eab308", label:"Low Risk Zone",      type: "zone" },
  { color:"#22c55e", label:"Safe Route",         type: "line" },
  { color:"#f97316", label:"Risky Route",        type: "line" },
];

export default function Home() {
  /* AI state */
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult,  setAiResult]  = useState<AssessmentResult | null>(null);
  const [aiError,   setAiError]   = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [queryVal,  setQueryVal]  = useState("");

  /* Map state */
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locStatus,    setLocStatus]    = useState<"loading"|"ok"|"denied"|"fallback">("loading");
  const [destination,  setDestination]  = useState<{ lat: number; lon: number; name: string } | null>(null);
  
  const [routes,       setRoutes]       = useState<RouteResult[]>([]);
  const [activeIndex,  setActiveIndex]  = useState(0);
  const activeRoute = routes[activeIndex] || null;

  const [routeStatus,  setRouteStatus]  = useState<"safe"|"all_risky"|null>(null);
  const [mapRouting,   setMapRouting]   = useState(false);
  const [travelMode,   setTravelMode]   = useState<"driving"|"foot">("driving");
  
  /* Weather state */
  const [weather, setWeather] = useState<{ precip: number, code: number } | null>(null);

  /* Navigation state */
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  /* Active tab on mobile */
  const [tab, setTab] = useState<"map"|"ai">("map");

  const resultRef = useRef<HTMLDivElement>(null);

  /* ── Geolocation ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    // Default Nagpur (Center of India) fallback if GPS fails
    const setFallback = () => {
      setUserLocation({ lat: 21.1458, lon: 79.0882 }); 
      setLocStatus("fallback");
    };

    if (!navigator.geolocation) { setFallback(); return; }
    
    if (isNavigating) {
      // High-accuracy live tracking during navigation
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLocStatus("ok");
        },
        () => setFallback(),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    } else {
      // Single snapshot for overview
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLocStatus("ok");
        },
        () => setFallback(),
        { timeout: 8000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isNavigating]);

  /* ── Live Weather ────────────────────────────────────────────────────────── */
  useEffect(() => {
    async function fetchWeather() {
      if (!userLocation) return;
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lon}&current=precipitation,weather_code`);
        const data = await res.json();
        if (data && data.current) {
          setWeather({ precip: data.current.precipitation, code: data.current.weather_code });
        }
      } catch (e) { console.error("Weather fetch failed", e); }
    }
    fetchWeather();
  }, [userLocation?.lat, userLocation?.lon]);

  /* ── Voice Navigation ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (isNavigating && voiceEnabled && activeRoute && activeRoute.steps[currentStepIndex]) {
      const instruction = activeRoute.steps[currentStepIndex].instruction;
      if (instruction && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(instruction);
        msg.rate = 1.0;
        window.speechSynthesis.speak(msg);
      }
    }
  }, [currentStepIndex, isNavigating, voiceEnabled, activeRoute]);

  /* ── AI assess ───────────────────────────────────────────────────────────── */
  const assess = useCallback(async (query: string) => {
    setAiLoading(true);
    setAiResult(null);
    setAiError(null);
    setLastQuery(query);
    if (tab === "map") setTab("ai"); // switch to AI tab on mobile after submit

    try {
      const res  = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data: AssessmentResult = await res.json();
      setAiResult(data);

      /* Trigger map routing if the query looks like a route */
      if (data.intent === "route" && data.destination) {
        routeOnMap(query, data.destination);
      }
    } catch {
      setAiError("Network error — please check your connection.");
    } finally {
      setAiLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior:"smooth", block:"nearest" }), 100);
    }
  }, [tab]);

  /* ── Map routing ─────────────────────────────────────────────────────────── */
  async function routeOnMap(query: string, destName: string) {
    if (!userLocation) {
      setAiError("Cannot route: Waiting for your GPS location.");
      return;
    }
    setMapRouting(true);
    try {
      const { searchPlace, fetchAlternativeRoutes } = await import("@/lib/routing");

      // Geocode destination
      const results = await searchPlace(destName);
      if (!results.length) {
        setAiError(`Could not find a map location for "${destName}". Try a more specific place.`);
        return;
      }
      const dest = results[0];
      setDestination({ lat: dest.lat, lon: dest.lon, name: dest.name });

      // Fetch routes
      const fetchedRoutes = await fetchAlternativeRoutes(
        [userLocation.lat, userLocation.lon],
        [results[0].lat, results[0].lon],
        travelMode
      );
      if (!fetchedRoutes.length) {
        setAiError("OSRM could not find a driving route to this destination.");
        return;
      }

      setRoutes(fetchedRoutes);
      setActiveIndex(0); // Safest/best is first by default
      setRouteStatus("safe");
      setIsNavigating(false);
      setCurrentStepIndex(0);
      setAiError(null); // Clear errors on success
    } catch (e) {
      console.error("Map routing failed:", e);
      setAiError("Failed to calculate routes. The routing server might be down.");
    } finally {
      setMapRouting(false);
    }
  }

  function handleSubmit() {
    const q = queryVal.trim();
    if (!q || aiLoading) return;
    assess(q);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  /* ── UI ──────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Background */}
      <div className="bg-canvas" aria-hidden>
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
      </div>

      <div style={{ position:"relative", zIndex:1, minHeight:"100dvh", display:"flex", flexDirection:"column" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header style={{
          position:"sticky", top:0, zIndex:50,
          borderBottom:"1px solid var(--glass-border)",
          background:"rgba(6,11,24,0.70)",
          backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
          padding:"12px 16px",
        }}>
          <div style={{ maxWidth:"1400px", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
            {/* Logo */}
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"34px", height:"34px", borderRadius:"10px",
                background:"linear-gradient(135deg,rgba(56,189,248,0.3),rgba(139,92,246,0.3))",
                border:"1px solid rgba(99,102,241,0.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px" }}>
                🌊
              </div>
              <div>
                <h1 style={{ fontSize:"17px", fontWeight:800, lineHeight:1.1 }} className="text-gradient">FloodPath</h1>
                <p style={{ fontSize:"10px", color:"var(--text-muted)", letterSpacing:"0.05em" }}>Waterlogging &amp; Flood-Prone Route Advisor · Kolkata</p>
              </div>
            </div>

            {/* Mobile tabs */}
            <div style={{ display:"flex", gap:"6px" }} className="mobile-tabs">
              {(["map","ai"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{
                    padding:"6px 14px", borderRadius:"100px", fontSize:"12px", fontWeight:600,
                    cursor:"pointer", border:"1px solid",
                    background: tab===t ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.04)",
                    borderColor: tab===t ? "rgba(99,102,241,0.5)" : "var(--glass-border)",
                    color: tab===t ? "rgba(165,180,252,0.95)" : "var(--text-muted)",
                    transition:"all 0.2s",
                  }}>
                  {t === "map" ? "🗺 Map" : "🤖 AI Risk"}
                </button>
              ))}
            </div>

            {/* Location pill */}
            <div style={{
              padding:"4px 10px", borderRadius:"100px", fontSize:"11px", fontWeight:600,
              display:"flex", alignItems:"center", gap:"5px",
              background: locStatus==="ok" ? "rgba(34,197,94,0.1)" : locStatus==="fallback" ? "rgba(249,115,22,0.1)" : locStatus==="loading" ? "rgba(99,102,241,0.1)" : "rgba(239,68,68,0.1)",
              border:`1px solid ${locStatus==="ok" ? "rgba(34,197,94,0.25)" : locStatus==="fallback" ? "rgba(249,115,22,0.3)" : locStatus==="loading" ? "rgba(99,102,241,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: locStatus==="ok" ? "rgba(134,239,172,0.9)" : locStatus==="fallback" ? "rgba(253,186,116,0.9)" : locStatus==="loading" ? "rgba(165,180,252,0.9)" : "rgba(252,165,165,0.9)",
            }}>
              <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"currentColor", display:"inline-block" }} />
              {locStatus==="ok" ? "Live GPS" : locStatus==="fallback" ? "Simulated GPS" : locStatus==="loading" ? "Locating…" : "Location off"}
            </div>
          </div>
        </header>

        {/* ── Main split layout ────────────────────────────────────────────── */}
        <main style={{ flex:1, display:"flex", minHeight:0 }}>

          {/* MAP PANEL */}
          <div style={{
            position:"relative",
            flex:"1 1 0",
            minWidth:0,
            display: typeof window !== "undefined" && window.innerWidth < 768 ? (tab==="map" ? "block" : "none") : "block",
          }} className="map-panel">

            <div style={{ position:"absolute", inset:0 }}>
              <FloodMap
                userLocation={userLocation}
                destination={destination}
                routes={routes}
                activeIndex={activeIndex}
                routeStatus={routeStatus}
                isNavigating={isNavigating}
                onSelectRoute={setActiveIndex}
              />
            </div>

            {/* Map legend */}
            <div style={{
              position:"absolute", top:"16px", left:"16px", zIndex:1000,
              background:"rgba(6, 11, 24, 0.35)", backdropFilter:"blur(12px)",
              WebkitBackdropFilter:"blur(12px)",
              border:"1px solid rgba(255, 255, 255, 0.15)", borderRadius:"12px",
              padding:"14px 16px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
            }}>
              <p className="label-caps" style={{ marginBottom:"10px", color:"#fff", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>Map Key</p>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {LEGEND.map(l => (
                  <div key={l.label} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    {l.type === "zone" ? (
                      <span style={{ width:"12px", height:"12px", borderRadius:"3px", background:l.color, flexShrink:0, border:"1px solid rgba(255,255,255,0.2)" }} />
                    ) : (
                      <span style={{ width:"14px", height:"4px", borderRadius:"2px", background:l.color, flexShrink:0, boxShadow:`0 0 8px ${l.color}90` }} />
                    )}
                    <span style={{ fontSize:"12px", color:"#fff", fontWeight:600, textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{l.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Weather Widget */}
              {weather && (
                <div style={{ marginTop:"16px", padding:"12px", background:"rgba(14,165,233,0.1)", borderRadius:"12px", border:"1px solid rgba(14,165,233,0.2)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                    <span style={{ fontSize:"16px" }}>{weather.precip > 0 ? "🌧️" : "⛅"}</span>
                    <span style={{ fontSize:"11px", fontWeight:700, color:"#38bdf8", textTransform:"uppercase", letterSpacing:"0.05em" }}>Live Local Weather</span>
                  </div>
                  <p style={{ fontSize:"12px", color:"#e0f2fe", margin:0 }}>
                    Precipitation: <strong style={{ color: weather.precip > 5 ? "#ef4444" : "#f8fafc" }}>{weather.precip} mm</strong>
                    {weather.precip > 5 && " ⚠️ Heavy rain detected!"}
                  </p>
                </div>
              )}

              {mapRouting && (
                <p style={{ fontSize:"11px", color:"rgba(165,180,252,0.9)", marginTop:"10px", fontWeight:600 }}>⟳ Routing…</p>
              )}
            </div>

            {/* Active route banner OR Navigation Overlay */}
            {isNavigating && activeRoute ? (
              <div 
                aria-live="polite" 
                aria-atomic="true"
                role="region"
                aria-label="Turn by Turn Navigation"
                style={{
                  position:"absolute", top:"16px", left:"50%", transform:"translateX(-50%)",
                  width:"90%", maxWidth:"400px", zIndex:1000,
                  background:"rgba(15,23,42,0.95)", backdropFilter:"blur(24px)",
                  WebkitBackdropFilter:"blur(24px)",
                  border:"1px solid rgba(99,102,241,0.5)", borderRadius:"16px",
                  padding:"16px", boxShadow:"0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                  <span style={{ fontSize:"11px", fontWeight:700, color:"#38bdf8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    ● Live Navigation
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button aria-label="Toggle Voice" onClick={() => setVoiceEnabled(v => !v)} style={{
                      background: voiceEnabled ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.1)",
                      color: voiceEnabled ? "#86efac" : "#fff",
                      border: `1px solid ${voiceEnabled ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.2)"}`,
                      padding:"4px 10px", borderRadius:"100px", fontSize:"10px", fontWeight:700, cursor:"pointer"
                    }}>
                      {voiceEnabled ? "🔊 ON" : "🔇 OFF"}
                    </button>
                    <button aria-label="End Navigation" onClick={() => setIsNavigating(false)} style={{
                      background:"rgba(239,68,68,0.15)", color:"#fca5a5", border:"1px solid rgba(239,68,68,0.3)",
                      padding:"4px 10px", borderRadius:"100px", fontSize:"10px", fontWeight:700, cursor:"pointer"
                    }}>END</button>
                  </div>
                </div>
                
                <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
                  <div aria-hidden="true" style={{ width:"48px", height:"48px", borderRadius:"12px", background:"rgba(99,102,241,0.2)",
                    border:"1px solid rgba(99,102,241,0.4)", display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"24px", flexShrink:0 }}>
                    {activeRoute.steps[currentStepIndex]?.modifier?.includes("left") ? "⬅️" :
                     activeRoute.steps[currentStepIndex]?.modifier?.includes("right") ? "➡️" :
                     activeRoute.steps[currentStepIndex]?.type === "arrive" ? "🎯" : "⬆️"}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:"18px", fontWeight:800, color:"#fff", lineHeight:1.2 }}>
                      {activeRoute.steps[currentStepIndex]?.instruction || "Continue"}
                    </p>
                    <p style={{ fontSize:"14px", color:"#94a3b8", fontWeight:600, marginTop:"4px" }}>
                      in {activeRoute.steps[currentStepIndex]?.distance || 0}m
                    </p>
                  </div>
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", marginTop:"16px", borderTop:"1px solid rgba(255,255,255,0.1)", paddingTop:"12px" }}>
                  <button 
                    aria-label="Previous Step"
                    disabled={currentStepIndex === 0}
                    onClick={() => setCurrentStepIndex(c => Math.max(0, c - 1))}
                    style={{ padding:"8px 16px", borderRadius:"8px", background:"rgba(255,255,255,0.1)", color:"#fff", fontSize:"12px", border:"none", cursor:"pointer", opacity: currentStepIndex===0 ? 0.3:1 }}
                  >← Prev Step</button>
                  <button 
                    aria-label="Next Step"
                    disabled={currentStepIndex >= activeRoute.steps.length - 1}
                    onClick={() => setCurrentStepIndex(c => Math.min(activeRoute.steps.length - 1, c + 1))}
                    style={{ padding:"8px 16px", borderRadius:"8px", background:"#4f46e5", color:"#fff", fontSize:"12px", fontWeight:700, border:"none", cursor:"pointer", opacity: currentStepIndex >= activeRoute.steps.length -1 ? 0.3:1 }}
                  >Next Step →</button>
                </div>
              </div>
            ) : null}
          </div>

          {/* SIDEBAR / AI PANEL */}
          <div style={{
            width: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : "380px",
            flexShrink: 0,
            overflowY:"auto",
            borderLeft:"1px solid var(--glass-border)",
            background:"rgba(6,11,24,0.60)",
            backdropFilter:"blur(20px)",
            WebkitBackdropFilter:"blur(20px)",
            display: typeof window !== "undefined" && window.innerWidth < 768 ? (tab==="ai" ? "block" : "none") : "block",
            padding:"20px 16px",
            paddingBottom:"0",
          }} className="ai-panel">

            {/* Panel header */}
            <div style={{ marginBottom:"16px" }}>
              <h2 style={{ fontSize:"15px", fontWeight:800, marginBottom:"4px" }} className="text-gradient">
                AI Risk Assessment
              </h2>
              <p style={{ fontSize:"12px", color:"var(--text-muted)", lineHeight:1.5 }}>
                Ask in plain English — grounded in real Kolkata flood data
              </p>
            </div>

            {/* Query input */}
            <div className="glass-strong" style={{ padding:"16px", marginBottom:"14px" }}>
              <div style={{ position:"relative", marginBottom:"10px" }}>
                <textarea
                  value={queryVal}
                  onChange={e => setQueryVal(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={aiLoading}
                  rows={2}
                  placeholder="e.g. Going from Jadavpur to Esplanade?"
                  className="glass-input"
                  style={{ fontSize:"13px", padding:"10px 14px" }}
                  id="query-input"
                  aria-label="Route or area query"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!queryVal.trim() || aiLoading}
                className="btn-primary"
                style={{ padding:"11px", fontSize:"13px" }}
                id="submit-btn"
              >
                {aiLoading ? "⟳ Assessing…" : "Check Route Safety →"}
              </button>
            </div>

            {/* Quick prompts */}
            <div style={{ marginBottom:"14px" }}>
              <p className="label-caps" style={{ marginBottom:"8px" }}>Try these</p>
              <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
                {QUICK.map(p => (
                  <button key={p.label} onClick={() => { setQueryVal(p.label); assess(p.label); }}
                    disabled={aiLoading} className="chip" style={{ fontSize:"12px", padding:"8px 12px" }}>
                    <span className="chip-arrow">→</span>
                    <span style={{ flex:1 }}>{p.label}</span>
                    <span style={{ flexShrink:0, fontSize:"10px", fontWeight:600, padding:"2px 7px",
                      borderRadius:"100px", ...TAG_STYLE[p.tag] }}>{p.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Results or Alternative Routes */}
            <div ref={resultRef}>
              {aiLoading && <LoadingState />}
              {aiError && !aiLoading && (
                <div className="glass" style={{ padding:"16px", border:"1px solid rgba(239,68,68,0.25)",
                  background:"rgba(239,68,68,0.07)", marginBottom:"14px" }}>
                  <p style={{ fontSize:"13px", color:"rgba(252,165,165,0.9)" }}>{aiError}</p>
                </div>
              )}
              
              {/* If we have routes, show the route list (Google Maps style) */}
              {routes.length > 0 && !aiLoading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"16px" }}>
                  <div style={{ padding:"12px 16px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:"12px" }}>
                    <p style={{ fontSize:"14px", color:"#86efac", fontWeight:700 }}>✓ Safest routes mapped</p>
                    <p style={{ fontSize:"12px", color:"#bbf7d0", marginTop:"4px" }}>Select a route below to preview, then start navigation.</p>
                  </div>
                  
                  {routes.map((r, i) => (
                    <div 
                      key={i} 
                      onClick={() => setActiveIndex(i)}
                      style={{
                        padding:"16px", borderRadius:"12px", cursor:"pointer", transition:"all 0.2s",
                        background: activeIndex === i ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${activeIndex === i ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.1)"}`,
                        display:"flex", flexDirection:"column", gap:"8px"
                      }}
                    >
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <p style={{ fontSize:"16px", fontWeight:700, color: activeIndex===i ? "#fff" : "var(--text-primary)" }}>
                            {r.duration} min
                          </p>
                          <p style={{ fontSize:"12px", color:"var(--text-muted)", marginTop:"2px" }}>
                            {r.distance} km
                          </p>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
                          {i === 0 && (
                            <span style={{ fontSize:"10px", fontWeight:800, background:"#22c55e", color:"#000", padding:"2px 6px", borderRadius:"4px", textTransform:"uppercase" }}>
                              Best Route
                            </span>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize:"13px", color:"var(--text-secondary)", fontWeight:500 }}>
                        {r.summary}
                      </p>
                      
                      {/* Navigation Button for Active Route */}
                      {activeIndex === i && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setIsNavigating(true); }}
                          style={{
                            marginTop:"12px", padding:"10px 0", width:"100%", borderRadius:"100px",
                            background:"#3b82f6", color:"#fff", fontWeight:700, fontSize:"14px", border:"none",
                            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                            boxShadow:"0 4px 14px rgba(59,130,246,0.4)"
                          }}
                        >
                          ⬈ Start Navigation
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {/* Also show AI Risk summary if available */}
                  {aiResult && (
                    <div style={{ marginTop:"12px", borderTop:"1px solid var(--glass-border)", paddingTop:"16px" }}>
                      <p style={{ fontSize:"12px", color:"var(--text-muted)", marginBottom:"8px", fontWeight:600 }}>AI Risk Analysis</p>
                      <RiskCard result={aiResult} />
                    </div>
                  )}
                </div>
              ) : aiResult && !aiLoading ? (
                <div style={{ marginBottom:"14px" }}>
                  <p style={{ fontSize:"10px", color:"var(--text-muted)", marginBottom:"8px", fontFamily:"monospace" }}>
                    Query: &quot;{lastQuery}&quot;
                  </p>
                  <RiskCard result={aiResult} />
                </div>
              ) : !aiLoading && !aiError ? (
                <div className="glass" style={{ padding:"18px", textAlign:"center", marginBottom:"14px" }}>
                  <p style={{ fontSize:"13px", color:"var(--text-muted)", lineHeight:1.7, marginBottom:"16px" }}>
                    Type a query above or tap a quick prompt to see alternative safe routes and AI risk assessment here.
                  </p>
                  <div style={{ display:"flex", justifyContent:"center", gap:"20px", paddingTop:"12px",
                    borderTop:"1px solid var(--glass-border)", flexWrap:"wrap" }}>
                    {[{ v:"16", l:"Mapped zones" },{ v:"2021–26", l:"Data range" },{ v:"0", l:"Hallucinations" }].map(s => (
                      <div key={s.l} style={{ textAlign:"center" }}>
                        <p style={{ fontSize:"18px", fontWeight:800 }} className="text-gradient">{s.v}</p>
                        <p style={{ fontSize:"10px", color:"var(--text-muted)" }}>{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>

        <DisclaimerFooter />
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-tabs { display: none !important; }
          .map-panel   { display: block !important; }
          .ai-panel    { display: block !important; width: 380px !important; }
        }
        @media (max-width: 767px) {
          .map-panel, .ai-panel { width: 100% !important; }
        }
        main { height: calc(100dvh - 57px - 73px); }
      `}</style>
    </>
  );
}
