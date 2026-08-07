"use client";
import { useState, useRef } from "react";

interface Props {
  onSubmit: (query: string) => void;
  loading: boolean;
}

export default function QueryInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    const q = value.trim();
    if (!q || loading) return;
    onSubmit(q);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={3}
          placeholder="e.g. Going from Ultadanga to Park Street this evening, is it safe?"
          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 text-[15px] placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
          aria-label="Route or area query"
        />
        {value.length > 0 && !loading && (
          <button
            onClick={() => setValue("")}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xs"
            aria-label="Clear input"
          >
            ✕
          </button>
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || loading}
        className="w-full rounded-xl bg-blue-700 px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-blue-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Assessing…" : "Check Route Safety →"}
      </button>
      <p className="text-xs text-slate-400 text-center">
        Press <kbd className="rounded border border-slate-200 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to submit
      </p>
    </div>
  );
}
