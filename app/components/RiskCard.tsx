import type { AssessmentResult, RiskLevel } from "@/lib/types";

interface Props {
  result: AssessmentResult;
}

/* ── Badge config ──────────────────────────────────────────────────────────── */
const BADGE: Record<string, { cls: string; dot: string; label: string }> = {
  Low:     { cls: "badge badge-low",    dot: "badge-dot badge-dot-low",    label: "Low Risk" },
  Moderate:{ cls: "badge badge-mod",    dot: "badge-dot badge-dot-mod",    label: "Moderate Risk" },
  High:    { cls: "badge badge-high",   dot: "badge-dot badge-dot-high",   label: "High Risk" },
  Severe:  { cls: "badge badge-severe", dot: "badge-dot badge-dot-severe", label: "Severe Risk" },
  Unknown: { cls: "badge badge-unk",    dot: "badge-dot badge-dot-unk",    label: "Unknown" },
};

const GLOW: Record<string, string> = {
  Low:     "risk-glow-low",
  Moderate:"risk-glow-mod",
  High:    "risk-glow-high",
  Severe:  "risk-glow-severe",
  Unknown: "risk-glow-unk",
};

function RiskBadge({ level }: { level: string | null | undefined }) {
  const cfg = BADGE[level ?? "Unknown"] ?? BADGE.Unknown;
  return (
    <span className={cfg.cls}>
      <span className={cfg.dot} />
      {cfg.label}
    </span>
  );
}

const CONF_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const CONF_COLOR: Record<string, string> = {
  high:   "rgba(34,197,94,0.7)",
  medium: "rgba(251,191,36,0.7)",
  low:    "rgba(148,163,184,0.6)",
};

/* ── Area dot color ───────────────────────────────────────────────────────── */
const DOT_COLOR: Record<string, string> = {
  Low:     "#22c55e",
  Moderate:"#fbbf24",
  High:    "#ef4444",
  Severe:  "#dc2626",
  Unknown: "#94a3b8",
};

export default function RiskCard({ result }: Props) {
  const {
    intent, overall_risk_level, location_breakdown,
    rationale, alternative_suggestion, clarifying_question,
    confidence, origin, destination,
  } = result;

  const glowClass = GLOW[overall_risk_level ?? "Unknown"] ?? GLOW.Unknown;

  /* ── Unclear / off-topic ─────────────────────────────────────────────────── */
  if (intent === "unclear") {
    return (
      <div className={`glass animate-in ${glowClass}`} style={{ padding: "28px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <span style={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}>🤔</span>
          <div>
            <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "15px", marginBottom: "8px" }}>
              Couldn&apos;t understand that query
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6 }}>
              {clarifying_question ?? "Try asking about a specific area or route in Kolkata — e.g. \"Is Jadavpur safe?\""}
            </p>
            <p style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
              {rationale}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main result card ────────────────────────────────────────────────────── */
  return (
    <div className={`glass animate-in ${glowClass}`}>

      {/* Header */}
      <div style={{ padding: "20px 24px 16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <RiskBadge level={overall_risk_level} />
            <span style={{ fontSize: "11px", color: CONF_COLOR[confidence] ?? "var(--text-muted)", fontWeight: 500 }}>
              {CONF_LABEL[confidence]}
            </span>
          </div>
          {(origin || destination) && (
            <p style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "monospace",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--glass-border)",
              borderRadius: "6px",
              padding: "3px 8px",
            }}>
              {[origin, destination].filter(Boolean).join(" → ")}
            </p>
          )}
        </div>
      </div>

      <div className="glass-divider" />

      {/* Rationale */}
      <div style={{ padding: "18px 24px" }}>
        <p className="label-caps" style={{ marginBottom: "8px" }}>Assessment</p>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {rationale}
        </p>
      </div>

      {/* Location breakdown */}
      {location_breakdown.length > 0 && (
        <>
          <div className="glass-divider" />
          <div style={{ padding: "18px 24px" }}>
            <p className="label-caps" style={{ marginBottom: "14px" }}>Area Breakdown</p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
              {location_breakdown.map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{
                    width: "9px", height: "9px",
                    borderRadius: "50%",
                    background: DOT_COLOR[item.risk_level] ?? DOT_COLOR.Unknown,
                    flexShrink: 0,
                    marginTop: "5px",
                    boxShadow: `0 0 8px ${DOT_COLOR[item.risk_level] ?? DOT_COLOR.Unknown}60`,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
                        {item.area}
                      </span>
                      <RiskBadge level={item.risk_level} />
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.55 }}>
                      {item.reason}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Alternative suggestion */}
      {alternative_suggestion && (
        <>
          <div className="glass-divider" />
          <div style={{ padding: "16px 24px" }}>
            <div className="alt-callout">
              <p className="label-caps" style={{ marginBottom: "6px", color: "rgba(139,92,246,0.7)" }}>
                ↪ Suggested Alternative
              </p>
              <p style={{ fontSize: "13px", color: "rgba(196,181,253,0.9)", lineHeight: 1.65 }}>
                {alternative_suggestion}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Unknown-area notice */}
      {location_breakdown.some(l => l.risk_level === "Unknown") && (
        <>
          <div className="glass-divider" />
          <div style={{ padding: "14px 24px" }}>
            <div className="unknown-info">
              <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6, display: "flex", gap: "8px" }}>
                <span style={{ flexShrink: 0 }}>ℹ</span>
                <span>
                  Areas marked <strong style={{ color: "var(--risk-unk-text)" }}>Unknown</strong> are not
                  in our verified dataset. FloodPath refuses to guess — that&apos;s intentional and is what
                  makes it trustworthy for safety decisions.
                </span>
              </p>
            </div>
          </div>
        </>
      )}

      {/* Card footer */}
      <div className="glass-divider" />
      <div style={{ padding: "12px 24px" }}>
        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          Historical baseline · Not real-time · Verify with KMC before travel in active rainfall
        </p>
      </div>
    </div>
  );
}
