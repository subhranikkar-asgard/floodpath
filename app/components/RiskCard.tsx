import type { AssessmentResult, RiskLevel } from "@/lib/types";

interface Props {
  result: AssessmentResult;
}


const RISK_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  Low:     { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", label: "Low Risk" },
  Moderate:{ bg: "bg-amber-100",   text: "text-amber-800",   dot: "bg-amber-500",   label: "Moderate Risk" },
  High:    { bg: "bg-red-100",     text: "text-red-800",     dot: "bg-red-500",     label: "High Risk" },
  Severe:  { bg: "bg-red-200",     text: "text-red-900",     dot: "bg-red-700",     label: "Severe Risk" },
  Unknown: { bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400",   label: "Unknown" },
};

function RiskBadge({ level }: { level: string | null | undefined }) {
  const cfg = RISK_CONFIG[level ?? "Unknown"] ?? RISK_CONFIG.Unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export default function RiskCard({ result }: Props) {
  const { intent, overall_risk_level, location_breakdown, rationale,
          alternative_suggestion, clarifying_question, confidence,
          origin, destination } = result;

  if (intent === "unclear") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤔</span>
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-1">Couldn't understand that query</h2>
            {clarifying_question ? (
              <p className="text-sm text-slate-600">{clarifying_question}</p>
            ) : (
              <p className="text-sm text-slate-600">
                Try asking about a specific area or route in Kolkata, e.g.{" "}
                <em>"Is Jadavpur safe to travel through?"</em>
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Rationale: {rationale}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <RiskBadge level={overall_risk_level} />
            <span className="ml-3 text-xs text-slate-400">{CONFIDENCE_LABEL[confidence]}</span>
          </div>
          {(origin || destination) && (
            <p className="text-xs text-slate-500 font-mono">
              {[origin, destination].filter(Boolean).join(" → ")}
            </p>
          )}
        </div>
      </div>

      {/* Rationale */}
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Assessment</h3>
        <p className="text-[15px] text-slate-700 leading-relaxed">{rationale}</p>
      </div>

      {/* Location breakdown */}
      {location_breakdown.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Area Breakdown</h3>
          <ul className="space-y-3">
            {location_breakdown.map((item, i) => {
              const cfg = RISK_CONFIG[item.risk_level] ?? RISK_CONFIG.Unknown;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">{item.area}</span>
                    <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                      {item.risk_level}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.reason}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Alternative suggestion */}
      {alternative_suggestion && (
        <div className="px-6 py-4 border-b border-slate-100 bg-blue-50">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-blue-500 mb-2 flex items-center gap-1.5">
            <span>↪</span> Suggested Alternative
          </h3>
          <p className="text-sm text-blue-800 leading-relaxed">{alternative_suggestion}</p>
        </div>
      )}

      {/* Unknown area notice */}
      {location_breakdown.some(l => l.risk_level === "Unknown") && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs text-slate-500 flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">ℹ</span>
            <span>
              Areas marked <strong>Unknown</strong> are not in our verified dataset.
              FloodPath refuses to guess risk levels for unverified locations — that's intentional.
            </span>
          </p>
        </div>
      )}

      {/* Footer confidence */}
      <div className="px-6 py-3 bg-slate-50">
        <p className="text-[11px] text-slate-400">
          Based on historical baseline data · Not real-time · Verify with KMC before travel in active rainfall
        </p>
      </div>
    </div>
  );
}
