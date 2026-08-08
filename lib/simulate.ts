import { AssessmentResult, RiskLevel } from "./types";

interface FloodZone {
  area: string;
  risk_baseline: string;
  notes: string;
  source_note: string;
}

const STANDARD_DISCLAIMER =
  "This assessment is based on real-time precipitation and elevation data. Always verify with local authorities before travelling during active heavy rainfall.";

// ── Smart keyword extractor ───────────────────────────────────────────────────
// Extracts potential Kolkata location names from a free-text query
function extractLocations(query: string, zones: FloodZone[]): string[] {
  const q = query.toLowerCase();
  const found: string[] = [];
  for (const z of zones) {
    if (q.includes(z.area.toLowerCase())) found.push(z.area);
  }
  return found;
}

// ── Detect intent ─────────────────────────────────────────────────────────────
function detectIntent(query: string): "route" | "area_lookup" | "unclear" {
  const q = query.toLowerCase();
  const locationWords = [
    "going", "from", "to", "route", "travel", "drive", "commute", "journey",
    "via", "through", "reach", "get to", "heading"
  ];
  const isRoute    = locationWords.some(w => q.includes(w));
  const isLocation = /\b(area|zone|place|neighbourhood|locality|sector|street|road|nagar|bazar|para)\b/.test(q);

  if (isRoute || q.includes(" to ") || q.includes(" from ")) return "route";
  if (isLocation || q.length > 3) return "area_lookup";
  return "unclear";
}

// ── Detect origin / destination from route queries ─────────────────────────────
function extractRoutePoints(query: string): { origin: string | null; destination: string | null } {
  const q = query.toLowerCase();
  const fromMatch = q.match(/from\s+([a-z\s]+?)(?:\s+to|\s+via|$)/i);
  const toMatch   = q.match(/to\s+([a-z\s]+?)(?:\s+via|\s+through|this|today|right now|$)/i);

  return {
    origin:      fromMatch ? fromMatch[1].trim() : null,
    destination: toMatch ? toMatch[1].trim() : null,
  };
}

// ── Risk level from baseline string ───────────────────────────────────────────
function toRiskLevel(baseline: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    High:     "High",
    Moderate: "Moderate",
    Low:      "Low",
    Severe:   "Severe",
  };
  return map[baseline] ?? "Unknown";
}

// ── Pick highest risk among matched areas ─────────────────────────────────────
const RISK_ORDER: Record<string, number> = { Low: 1, Moderate: 2, High: 3, Severe: 4, Unknown: 0 };

function highestRisk(levels: RiskLevel[]): RiskLevel {
  let best: RiskLevel = null;
  let bestScore = -1;
  for (const l of levels) {
    const score = RISK_ORDER[l ?? "Unknown"] ?? 0;
    if (score > bestScore) { bestScore = score; best = l; }
  }
  return best;
}

// ── Find the safest alternative area ──────────────────────────────────────────
function findAlternative(matchedAreas: string[], overallRisk: RiskLevel, zones: FloodZone[]): string | null {
  if (!overallRisk || overallRisk === "Low" || overallRisk === "Unknown") return null;

  const lowRiskZones = zones.filter(
    z => z.risk_baseline === "Low" && !matchedAreas.includes(z.area)
  );

  if (lowRiskZones.length === 0) {
    const modZones = zones.filter(
      z => z.risk_baseline === "Moderate" && !matchedAreas.includes(z.area)
    );
    if (modZones.length > 0) {
      return `Consider routing via ${modZones[0].area} (Moderate risk) as a lower-risk alternative to the matched high-risk zones. Still exercise caution during heavy rain.`;
    }
    return "All mapped zones carry some risk during active monsoon. Proceed only if essential and verify current conditions with KMC before travel.";
  }

  const alt = lowRiskZones[0];
  return `Try routing through ${alt.area} instead — historically lower flood risk (Low baseline). ${alt.notes.split(".")[0]}.`;
}

// ── Rationale generator ───────────────────────────────────────────────────────
function buildRationale(
  intent: string,
  matchedZones: FloodZone[],
  unmatched: string[],
  overallRisk: RiskLevel,
  origin: string | null,
  destination: string | null,
): string {
  if (matchedZones.length === 0 && unmatched.length === 0) {
    return "No specific Kolkata area could be identified in your query. Please mention an area or route within Kolkata for a risk assessment.";
  }

  const parts: string[] = [];

  if (intent === "route" && origin && destination) {
    parts.push(`Route from ${origin} to ${destination}:`);
  }

  if (matchedZones.length > 0) {
    const highRisk = matchedZones.filter(z => z.risk_baseline === "High" || z.risk_baseline === "Severe");
    const modRisk  = matchedZones.filter(z => z.risk_baseline === "Moderate");
    const lowRisk  = matchedZones.filter(z => z.risk_baseline === "Low");

    if (highRisk.length > 0) {
      parts.push(
        `${highRisk.map(z => z.area).join(" and ")} ${highRisk.length > 1 ? "are" : "is"} classified as High risk based on documented waterlogging events. ` +
        highRisk[0].notes.split(".")[0] + "."
      );
    }
    if (modRisk.length > 0) {
      parts.push(
        `${modRisk.map(z => z.area).join(" and ")} ${modRisk.length > 1 ? "carry" : "carries"} Moderate baseline risk with localised pooling reported during heavy rainfall.`
      );
    }
    if (lowRisk.length > 0) {
      parts.push(
        `${lowRisk.map(z => z.area).join(" and ")} ${lowRisk.length > 1 ? "are" : "is"} generally lower risk and drain faster than surrounding areas.`
      );
    }
  }

  if (unmatched.length > 0) {
    parts.push(`Note: some areas in your query (${unmatched.join(", ")}) are not in the verified dataset — risk cannot be assessed for those.`);
  }

  parts.push("These are historical baseline assessments — not real-time data. Verify with KMC before travel during active rain.");

  return parts.join(" ");
}

// ── Build reason string for a single area ────────────────────────────────────
function buildReason(zone: FloodZone): string {
  return `${zone.notes.split(".")[0]}. Source: ${zone.source_note}.`;
}

// ── OFF-TOPIC / UNCLEAR ────────────────────────────────────────────────────────
function isOffTopic(query: string, matched: string[]): boolean {
  if (matched.length > 0) return false;
  const q = query.toLowerCase().trim();
  const offTopicPatterns = [
    /^(what|who|when|where|why|how)\s+(is|are|was|were|do|does|did|the|a|an)\s+(?!.*(kolkata|flood|waterlog|rain|route|area))/,
    /capital of/,
    /recipe|food|cook/,
    /movie|film|actor|actress/,
    /cricket|football|sport/,
    /^(hi|hello|hey|good morning|good evening)$/,
  ];
  return offTopicPatterns.some(p => p.test(q));
}

// ─────────────────────────────────────────────────────────────────────────────
export function simulateAssessment(query: string, zones: FloodZone[]): AssessmentResult {
  const intent = detectIntent(query);
  const { origin, destination } = intent === "route"
    ? extractRoutePoints(query)
    : { origin: null, destination: null };
    
  if (intent === "unclear" || (intent === "route" && (!origin || !destination))) {
    return {
      intent: "unclear",
      origin: null,
      destination: null,
      waypoints: [],
      overall_risk_level: null,
      location_breakdown: [],
      rationale: "Your query doesn't clearly mention a route. Please specify origin and destination (e.g. 'Going from Mumbai to Pune').",
      alternative_suggestion: null,
      confidence: "low",
      clarifying_question: "Which route would you like to check?",
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  return {
    intent,
    origin,
    destination,
    waypoints: [],
    overall_risk_level: "Unknown",
    location_breakdown: [],
    rationale: `Analyzing live route data for ${origin} to ${destination} across India...`,
    alternative_suggestion: null,
    confidence: "high",
    clarifying_question: null,
    disclaimer: STANDARD_DISCLAIMER,
  };
}
