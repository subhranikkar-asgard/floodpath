import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import { join } from "path";
import { SYSTEM_PROMPT, FLOODPATH_SCHEMA, STANDARD_DISCLAIMER } from "@/lib/systemPrompt";

const TIMEOUT_MS = 6000;

const SAFE_FALLBACK = {
  intent: "unclear",
  origin: null,
  destination: null,
  waypoints: [],
  overall_risk_level: null,
  location_breakdown: [],
  rationale:
    "Something went wrong on our end — please try again in a moment.",
  alternative_suggestion: null,
  confidence: "low",
  clarifying_question: null,
  disclaimer: STANDARD_DISCLAIMER,
};

const ALLOWED_INTENTS = ["route", "area_lookup", "unclear"];
const ALLOWED_RISKS = ["Low", "Moderate", "High", "Severe", "Unknown", null];
const ALLOWED_CONFIDENCE = ["low", "medium", "high"];

function validateResponse(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!ALLOWED_INTENTS.includes(d.intent as string)) return false;
  if (!ALLOWED_CONFIDENCE.includes(d.confidence as string)) return false;
  if (!Array.isArray(d.location_breakdown)) return false;
  if (typeof d.rationale !== "string") return false;
  if (typeof d.disclaimer !== "string") return false;
  if (
    d.overall_risk_level !== undefined &&
    !ALLOWED_RISKS.includes(d.overall_risk_level as string)
  )
    return false;
  return true;
}

async function callGemini(query: string, dataset: unknown[]): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey });

  const userContent = `FLOOD_ZONE_DATA:\n${JSON.stringify(dataset)}\n\nUSER_QUERY:\n"${query}"\n\nRespond using only the system instructions and schema provided.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Try primary model first, fall back if unavailable
    let response;
    for (const modelId of ["gemini-2.0-flash", "gemini-1.5-flash"]) {
      try {
        response = await ai.models.generateContent({
          model: modelId,
          contents: userContent,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: FLOODPATH_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 }, // low thinking for structured extraction
          },
        });
        break; // success — stop trying models
      } catch (modelErr: unknown) {
        const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
        if (msg.includes("not found") || msg.includes("404") || msg.includes("MODEL_NOT_FOUND")) {
          continue; // try next model
        }
        throw modelErr; // other error — rethrow
      }
    }

    if (!response) throw new Error("No model available");
    clearTimeout(timeout);

    const text = response.text;
    if (!text) throw new Error("Empty response from model");

    const parsed = JSON.parse(text);
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string = (body.query ?? "").trim();

    if (!query) {
      return NextResponse.json(
        {
          ...SAFE_FALLBACK,
          rationale: "Please enter a location or route query to assess.",
          clarifying_question:
            "What area or route in Kolkata would you like to check?",
        },
        { status: 400 }
      );
    }

    // Load dataset server-side only
    const dataPath = join(process.cwd(), "data", "flood_zone_data.json");
    const dataset = JSON.parse(readFileSync(dataPath, "utf-8"));

    let data: unknown;
    try {
      data = await callGemini(query, dataset);
    } catch {
      return NextResponse.json(SAFE_FALLBACK, { status: 200 });
    }

    if (!validateResponse(data)) {
      return NextResponse.json(SAFE_FALLBACK, { status: 200 });
    }

    // Ensure disclaimer is always the canonical one
    (data as Record<string, unknown>).disclaimer = STANDARD_DISCLAIMER;

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(SAFE_FALLBACK, { status: 200 });
  }
}
