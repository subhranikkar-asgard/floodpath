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
  { color:"#ef4444", label:"High Risk"     },
  { color:"#f97316", label:"Moderate Risk" },
  { color:"#eab308", label:"Low Risk"      },
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
  const [locStatus,    setLocStatus]    = useState<"loading"|"ok"|"denied">("loading");
  const [destination,  setDestination]  = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [activeRoute,  setActiveRoute]  = useState<RouteResult | null>(null);
  const [routeStatus,  setRouteStatus]  = useState<"safe"|"all_risky"|null>(null);
  const [mapRouting,   setMapRouting]   = useState(false);

  /* Active tab on mobile */
  const [tab, setTab] = useState<"map"|"ai">("map");

  const resultRef = useRef<HTMLDivElement>(null);

  /* ── Geolocation ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!navigator.geolocation) { setLocStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => setLocStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

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
    if (!userLocation) return;
    setMapRouting(true);
    try {
      const { searchPlace, fetchAlternativeRoutes } = await import("@/lib/routing");

      // Geocode destination
      const results = await searchPlace(destName);
      if (!results.length) return;
      const dest = results[0];
      setDestination({ lat: dest.lat, lon: dest.lon, name: dest.name });

      // Fetch routes
      const routes = await fetchAlternativeRoutes(
        [userLocation.lat, userLocation.lon],
        [dest.lat, dest.lon]
      );
      if (!routes.length) return;

      // Pick shortest (OSRM already optimises)
      const best = routes[0];
      setActiveRoute(best);
      setRouteStatus("safe");
    } catch (e) {
      console.error("Map routing failed:", e);
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
                <p style={{ fontSize:"10px", color:"var(--text-muted)", letterSpacing:"0.05em" }}>Kolkata · Flood Risk &amp; Route Advisor</p>
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
              background: locStatus==="ok" ? "rgba(34,197,94,0.1)" : locStatus==="loading" ? "rgba(99,102,241,0.1)" : "rgba(239,68,68,0.1)",
              border:`1px solid ${locStatus==="ok" ? "rgba(34,197,94,0.25)" : locStatus==="loading" ? "rgba(99,102,241,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: locStatus==="ok" ? "rgba(134,239,172,0.9)" : locStatus==="loading" ? "rgba(165,180,252,0.9)" : "rgba(252,165,165,0.9)",
            }}>
              <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"currentColor", display:"inline-block" }} />
              {locStatus==="ok" ? "Location found" : locStatus==="loading" ? "Locating…" : "Location off"}
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
                activeRoute={activeRoute}
                routeStatus={routeStatus}
              />
            </div>

            {/* Map legend */}
            <div style={{
              position:"absolute", bottom:"80px", left:"12px", zIndex:10,
              background:"rgba(6,11,24,0.75)", backdropFilter:"blur(16px)",
              border:"1px solid var(--glass-border)", borderRadius:"12px",
              padding:"10px 14px",
            }}>
              <p className="label-caps" style={{ marginBottom:"8px" }}>Flood Risk</p>
              {LEGEND.map(l => (
                <div key={l.label} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                  <span style={{ width:"10px", height:"10px", borderRadius:"2px", background:l.color, flexShrink:0, boxShadow:`0 0 6px ${l.color}60` }} />
                  <span style={{ fontSize:"11px", color:"var(--text-secondary)" }}>{l.label}</span>
                </div>
              ))}
              {mapRouting && (
                <p style={{ fontSize:"10px", color:"rgba(165,180,252,0.8)", marginTop:"6px" }}>Routing…</p>
              )}
            </div>

            {/* Active route banner */}
            {activeRoute && (
              <div style={{
                position:"absolute", top:"12px", left:"50%", transform:"translateX(-50%)",
                zIndex:10, whiteSpace:"nowrap",
                background:"rgba(6,11,24,0.80)", backdropFilter:"blur(16px)",
                border:`1px solid ${routeStatus==="safe" ? "rgba(34,197,94,0.3)" : "rgba(249,115,22,0.3)"}`,
                borderRadius:"100px", padding:"7px 16px", fontSize:"12px", fontWeight:600,
                color: routeStatus==="safe" ? "rgba(134,239,172,0.95)" : "rgba(253,186,116,0.95)",
                display:"flex", alignItems:"center", gap:"8px",
              }}>
                <span>{routeStatus==="safe" ? "✓" : "⚠"}</span>
                <span>
                  {routeStatus==="safe" ? "Safest route found" : "Route passes risky zones"}
                  {" · "}{activeRoute.duration} min · {activeRoute.distance} km
                </span>
              </div>
            )}
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

            {/* Results */}
            <div ref={resultRef}>
              {aiLoading && <LoadingState />}
              {aiError && !aiLoading && (
                <div className="glass" style={{ padding:"16px", border:"1px solid rgba(239,68,68,0.25)",
                  background:"rgba(239,68,68,0.07)", marginBottom:"14px" }}>
                  <p style={{ fontSize:"13px", color:"rgba(252,165,165,0.9)" }}>{aiError}</p>
                </div>
              )}
              {aiResult && !aiLoading && (
                <div style={{ marginBottom:"14px" }}>
                  <p style={{ fontSize:"10px", color:"var(--text-muted)", marginBottom:"8px", fontFamily:"monospace" }}>
                    Query: &quot;{lastQuery}&quot;
                  </p>
                  <RiskCard result={aiResult} />
                </div>
              )}
              {!aiResult && !aiLoading && !aiError && (
                <div className="glass" style={{ padding:"18px", textAlign:"center", marginBottom:"14px" }}>
                  <p style={{ fontSize:"13px", color:"var(--text-muted)", lineHeight:1.7, marginBottom:"16px" }}>
                    Type a query above or tap a quick prompt to see the AI risk assessment here.
                    Matching a route will also draw it on the map.
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
              )}
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
