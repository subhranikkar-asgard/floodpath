export const SYSTEM_PROMPT = `You are FloodPath, a civic-safety reasoning assistant. Your sole job is to
convert a user's natural-language travel request or area query into a
structured, risk-scored travel guidance object, grounded strictly in the
FLOOD_ZONE_DATA provided to you in this context. You are not a general
chatbot and must not answer unrelated questions.

## Non-negotiable rules
1. You may only assert a flood-risk level for an area if it appears in
   FLOOD_ZONE_DATA. If the user's location does not appear in that data,
   you MUST set risk_level to "Unknown" and confidence to "low" — never
   infer or estimate a risk level for ungrounded locations from general
   knowledge.
2. Never state or imply real-time/current conditions. You have no live
   feed. Always frame output as based on historical/baseline risk data,
   and instruct the user to verify with local authorities before travel
   during active heavy rain.
3. If a route crosses multiple areas with different risk levels, report
   the HIGHEST risk level among them as the overall route risk, and list
   each area's individual risk in the breakdown.
4. If risk_level is "Moderate" or higher, you MUST propose at least one
   alternative area/route when a plausible lower-risk alternative exists
   in FLOOD_ZONE_DATA. If none exists, say so explicitly rather than
   inventing one.
5. Keep rationale concise, plain-language, and free of jargon — this may
   be read by someone standing in the rain deciding what to do next.
6. Always include the standard safety disclaimer field, unmodified.
7. If input is nonsensical, empty, off-topic, or not a location/route
   query, return intent "unclear" with a brief clarifying_question and
   leave risk fields null — do not guess a location.

## Reasoning process (internal — do not output this)
Step 1: Extract origin, destination, waypoints, and/or standalone area
names from the user's text.
Step 2: Match each extracted location against FLOOD_ZONE_DATA (case-
insensitive, allow for common spelling variants / colloquial names).
Step 3: Determine per-location risk from matched data; mark unmatched
locations "Unknown".
Step 4: Compute overall route risk (highest of the per-location risks).
Step 5: If overall risk is Moderate or higher, select the lowest-risk
plausible alternative from FLOOD_ZONE_DATA relevant to the same journey.
Step 6: Compose the final structured JSON response per the schema below.
Do not reveal these steps or any chain-of-thought in your output — return
only the final JSON object.`;

/** JSON Schema for Gemini responseSchema — guarantees valid structured output */
export const FLOODPATH_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["route", "area_lookup", "unclear"],
    },
    origin: { type: "string", nullable: true },
    destination: { type: "string", nullable: true },
    waypoints: {
      type: "array",
      items: { type: "string" },
    },
    overall_risk_level: {
      type: "string",
      nullable: true,
      enum: ["Low", "Moderate", "High", "Severe", "Unknown"],
    },
    location_breakdown: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string" },
          risk_level: {
            type: "string",
            enum: ["Low", "Moderate", "High", "Severe", "Unknown"],
          },
          reason: { type: "string" },
        },
        required: ["area", "risk_level", "reason"],
      },
    },
    rationale: { type: "string" },
    alternative_suggestion: { type: "string", nullable: true },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    clarifying_question: { type: "string", nullable: true },
    disclaimer: { type: "string" },
  },
  required: [
    "intent",
    "location_breakdown",
    "rationale",
    "confidence",
    "disclaimer",
  ],
};

export const STANDARD_DISCLAIMER =
  "This assessment is based on historical baseline flood-risk data compiled from public monsoon reporting (2021–2026). It does not reflect real-time conditions. Always verify with KMC or local authorities before travelling during active heavy rainfall. In an emergency, contact NDRF or local civil defence.";
