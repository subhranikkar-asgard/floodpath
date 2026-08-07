import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { simulateAssessment } from "@/lib/simulate";
import { STANDARD_DISCLAIMER } from "@/lib/systemPrompt";
import type { AssessmentResult } from "@/lib/types";

const SAFE_FALLBACK: AssessmentResult = {
  intent: "unclear",
  origin: null,
  destination: null,
  waypoints: [],
  overall_risk_level: null,
  location_breakdown: [],
  rationale: "Something went wrong on our end — please try again in a moment.",
  alternative_suggestion: null,
  confidence: "low",
  clarifying_question: null,
  disclaimer: STANDARD_DISCLAIMER,
};

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json().catch(() => ({}));
    const query: string = (body.query ?? "").trim();

    if (!query) {
      return NextResponse.json(
        {
          ...SAFE_FALLBACK,
          rationale: "Please enter a location or route query to assess.",
          clarifying_question: "What area or route in Kolkata would you like to check?",
        },
        { status: 400 }
      );
    }

    // Load grounding dataset (server-side only)
    const dataPath = join(process.cwd(), "data", "flood_zone_data.json");
    const dataset  = JSON.parse(readFileSync(dataPath, "utf-8"));

    // ── Simulation mode (works without any API key) ────────────────────────
    //    For production: swap simulateAssessment() with a real Gemini call
    //    and pass dataset as grounding context.
    const result = simulateAssessment(query, dataset);

    // Guarantee disclaimer is always canonical
    result.disclaimer = STANDARD_DISCLAIMER;

    return NextResponse.json(result, { status: 200 });

  } catch {
    return NextResponse.json(SAFE_FALLBACK, { status: 200 });
  }
}
