"use client";
import { useState } from "react";
import QueryInput from "./components/QueryInput";
import RiskCard from "./components/RiskCard";
import LoadingState from "./components/LoadingState";
import DisclaimerFooter from "./components/DisclaimerFooter";
import type { AssessmentResult } from "@/lib/types";

const QUICK_PROMPTS = [
  "Going from Ultadanga to Park Street this evening, is it safe?",
  "Is Jadavpur okay to travel through right now?",
  "How about Salt Lake Sector V today?",
  "What's the capital of France?",
];


export default function Home() {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<AssessmentResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");

  async function assess(query: string) {
    setLoading(true);
    setResult(null);
    setError(null);
    setLastQuery(query);

    try {
      const res = await fetch("/api/assess", {
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-5">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl" aria-hidden>🌊</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">FloodPath</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Kolkata
            </span>
          </div>
          <p className="text-sm text-slate-500 ml-10 leading-relaxed">
            AI-powered flood risk guidance · Grounded in verified public data · Never guesses
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Dataset notice */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Dataset notice:</strong> Risk data is compiled from public monsoon reporting
              (2021–2026) — illustrative sample, not an official municipal feed. For production,
              this would connect to the KMC drainage department API.
            </p>
          </div>

          {/* Input card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              Check a route or area
            </h2>
            <QueryInput onSubmit={assess} loading={loading} />

            {/* Quick prompt chips */}
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Try these examples
              </p>
              <div className="flex flex-col gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => assess(prompt)}
                    disabled={loading}
                    className="group rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="mr-1.5 text-slate-400 group-hover:text-blue-400">→</span>
                    {prompt}
                    {prompt === "What's the capital of France?" && (
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 font-medium">
                        shows "unclear" branch
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {loading && <LoadingState />}

          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && !loading && (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-mono">
                Query: &quot;{lastQuery}&quot;
              </p>
              <RiskCard result={result} />
            </div>
          )}

          {/* Architecture note */}
          {!result && !loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
              <p className="text-sm text-slate-500 leading-relaxed">
                Enter a route or area query above. FloodPath uses{" "}
                <strong className="text-slate-700">Google Gemini</strong> with a strict JSON
                schema and a verified dataset — it will say{" "}
                <strong className="text-slate-700">"Unknown"</strong> rather than guess for
                unlisted areas.
              </p>
            </div>
          )}
        </div>
      </main>

      <DisclaimerFooter />
    </div>
  );
}
