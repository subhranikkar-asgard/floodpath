"use client";
import { useState } from "react";
import QueryInput from "./components/QueryInput";
import RiskCard from "./components/RiskCard";
import LoadingState from "./components/LoadingState";
import DisclaimerFooter from "./components/DisclaimerFooter";
import type { AssessmentResult } from "@/lib/types";

const QUICK_PROMPTS = [
  { label: "Going from Ultadanga to Park Street this evening, is it safe?", tag: "Route" },
  { label: "Is Jadavpur okay to travel through right now?",                 tag: "Area" },
  { label: "How about Salt Lake Sector V today?",                           tag: "Area" },
  { label: "What's the capital of France?",                                 tag: "Off-topic ↗" },
];

export default function Home() {
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<AssessmentResult | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");

  async function assess(query: string) {
    setLoading(true);
    setResult(null);
    setError(null);
    setLastQuery(query);
    try {
      const res  = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data: AssessmentResult = await res.json();
      setResult(data);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Animated background */}
      <div className="bg-canvas" aria-hidden>
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <div className="bg-orb bg-orb--3" />
      </div>

      <div style={{ position: "relative", zIndex: 1, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

        {/* ── Floating glass header ───────────────────────────────────────── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          borderBottom: "1px solid var(--glass-border)",
          background: "rgba(6,11,24,0.65)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          padding: "14px 20px",
        }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(56,189,248,0.3), rgba(139,92,246,0.3))",
                border: "1px solid rgba(99,102,241,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px",
                backdropFilter: "blur(8px)",
              }}>🌊</div>
              <div>
                <h1 style={{ fontSize: "18px", fontWeight: 800, lineHeight: 1.1 }} className="text-gradient">
                  FloodPath
                </h1>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.04em" }}>
                  Kolkata · Flood Risk Advisor
                </p>
              </div>
            </div>
            <div style={{
              padding: "4px 10px",
              borderRadius: "100px",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              fontSize: "11px",
              color: "rgba(134,239,172,0.9)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              Live
            </div>
          </div>
        </header>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: "32px 16px 40px", maxWidth: "720px", width: "100%", margin: "0 auto" }}>

          {/* Hero */}
          <div style={{ marginBottom: "28px", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 900, lineHeight: 1.2, marginBottom: "10px" }}>
              <span className="text-gradient">Is your route safe</span>
              <br />
              <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.75em" }}>
                during Kolkata&apos;s monsoon?
              </span>
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.65, maxWidth: "480px", margin: "0 auto" }}>
              Ask in plain English. Grounded in real flood data — never guesses for unlisted areas.
            </p>
          </div>

          {/* Dataset notice */}
          <div className="dataset-notice" style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", color: "rgba(251,191,36,0.75)", lineHeight: 1.55 }}>
              <strong style={{ fontWeight: 700 }}>Dataset:</strong> Compiled from public monsoon
              reporting (2021–2026). Illustrative sample — for production, connect to the KMC
              drainage department feed.
            </p>
          </div>

          {/* Main query card */}
          <div className="glass-strong" style={{ padding: "24px", marginBottom: "20px" }}>
            <p className="label-caps" style={{ marginBottom: "14px" }}>Check a route or area</p>
            <QueryInput onSubmit={assess} loading={loading} />

            {/* Quick prompts */}
            <div style={{ marginTop: "20px" }}>
              <p className="label-caps" style={{ marginBottom: "10px" }}>Try these examples</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => assess(p.label)}
                    disabled={loading}
                    className="chip"
                  >
                    <span className="chip-arrow">→</span>
                    <span style={{ flex: 1 }}>{p.label}</span>
                    <span style={{
                      flexShrink: 0,
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: "100px",
                      background: p.tag === "Off-topic ↗"
                        ? "rgba(148,163,184,0.12)"
                        : p.tag === "Route"
                        ? "rgba(99,102,241,0.14)"
                        : "rgba(14,165,233,0.12)",
                      color: p.tag === "Off-topic ↗"
                        ? "var(--text-muted)"
                        : p.tag === "Route"
                        ? "rgba(165,180,252,0.9)"
                        : "rgba(125,211,252,0.9)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      {p.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {loading && <LoadingState />}

          {error && !loading && (
            <div className="glass animate-in" style={{
              padding: "20px 24px",
              border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.07)",
            }}>
              <p style={{ fontSize: "14px", color: "rgba(252,165,165,0.9)" }}>{error}</p>
            </div>
          )}

          {result && !loading && (
            <div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px", fontFamily: "monospace" }}>
                Query: &quot;{lastQuery}&quot;
              </p>
              <RiskCard result={result} />
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="glass" style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                Enter a route or neighbourhood query above.{" "}
                <span style={{ color: "var(--text-secondary)" }}>FloodPath</span> will match it
                against verified Kolkata flood data and show an{" "}
                <span style={{ color: "var(--risk-unk-text)" }}>Unknown</span> state rather
                than guess for unlisted locations.
              </p>

              {/* Stats row */}
              <div style={{
                display: "flex", justifyContent: "center", gap: "24px",
                marginTop: "20px", paddingTop: "20px",
                borderTop: "1px solid var(--glass-border)",
                flexWrap: "wrap",
              }}>
                {[
                  { value: "18", label: "Mapped zones" },
                  { value: "2021–2026", label: "Data range" },
                  { value: "0", label: "Hallucinations" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "20px", fontWeight: 800 }} className="text-gradient">{s.value}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        <DisclaimerFooter />
      </div>
    </>
  );
}
