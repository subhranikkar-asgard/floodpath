export type RiskLevel = "Low" | "Moderate" | "High" | "Severe" | "Unknown" | null;
export type Confidence = "low" | "medium" | "high";
export type Intent = "route" | "area_lookup" | "unclear";

export interface LocationBreakdown {
  area: string;
  risk_level: string;
  reason: string;
}

export interface AssessmentResult {
  intent: Intent;
  origin?: string | null;
  destination?: string | null;
  waypoints?: string[];
  overall_risk_level?: RiskLevel;
  location_breakdown: LocationBreakdown[];
  rationale: string;
  alternative_suggestion?: string | null;
  confidence: Confidence;
  clarifying_question?: string | null;
  disclaimer: string;
}
