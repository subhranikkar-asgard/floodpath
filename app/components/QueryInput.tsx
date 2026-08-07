"use client";
import { useState, useRef } from "react";

interface Props {
  onSubmit: (query: string) => void;
  loading: boolean;
}

export default function QueryInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

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
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ position: "relative" }}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={3}
          placeholder="e.g. Going from Ultadanga to Park Street this evening, is it safe?"
          className="glass-input"
          aria-label="Route or area query"
          id="query-input"
        />
        {value.length > 0 && !loading && (
          <button
            onClick={() => setValue("")}
            aria-label="Clear input"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "rgba(255,255,255,0.4)",
              fontSize: "11px",
              padding: "2px 7px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            ✕
          </button>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!value.trim() || loading}
        className="btn-primary"
        id="submit-btn"
      >
        {loading ? (
          <>
            <span style={{ animation: "spin 0.9s linear infinite", display: "inline-block" }}>⟳</span>
            Assessing risk…
          </>
        ) : (
          <>
            <span>Check Route Safety</span>
            <span>→</span>
          </>
        )}
      </button>

      <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
        Press <kbd style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "4px",
          padding: "1px 5px",
          fontSize: "10px",
          fontFamily: "monospace",
        }}>Enter</kbd> to submit
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
