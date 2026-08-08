import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { GoogleGenAI } from "@google/genai";
import { simulateAssessment } from "@/lib/simulate";
import { SYSTEM_PROMPT, FLOODPATH_SCHEMA, STANDARD_DISCLAIMER } from "@/lib/systemPrompt";
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

    // Check if API key is provided
    if (!process.env.GEMINI_API_KEY) {
      // Fallback to simulation mode
      console.warn("No GEMINI_API_KEY found, falling back to simulation mode.");
      const result = simulateAssessment(query, dataset);
      result.disclaimer = STANDARD_DISCLAIMER;
      return NextResponse.json(result, { status: 200 });
    }

    // Call real Gemini API
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User Query: "${query}"\n\nFLOOD_ZONE_DATA (Context):\n${JSON.stringify(dataset)}`,
      config: {
        systemInstruction: SYSTEM_PROMPT + "\n\nJSON SCHEMA TO FOLLOW:\n" + JSON.stringify(FLOODPATH_SCHEMA),
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    if (!response.text) throw new Error("No text in response");
    
    // Safely parse JSON even if Gemini wraps it in markdown code blocks
    let rawText = response.text.trim();
    if (rawText.startsWith("```json")) rawText = rawText.replace(/^```json/, "");
    if (rawText.startsWith("```")) rawText = rawText.replace(/^```/, "");
    if (rawText.endsWith("```")) rawText = rawText.replace(/```$/, "");
    
    const result: AssessmentResult = JSON.parse(rawText.trim());

    // Guarantee disclaimer is always canonical
    result.disclaimer = STANDARD_DISCLAIMER;

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Gemini AI API Error:", error);
    return NextResponse.json(SAFE_FALLBACK, { status: 200 });
  }
}
