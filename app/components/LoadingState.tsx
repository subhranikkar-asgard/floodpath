export default function LoadingState() {
  return (
    <div className="glass animate-in" style={{ padding: "28px 24px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div className="skeleton" style={{ height: "28px", width: "110px", borderRadius: "100px" }} />
        <div className="skeleton" style={{ height: "14px", width: "80px" }} />
      </div>

      {/* Rationale lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
        <div className="skeleton" style={{ height: "14px", width: "100%" }} />
        <div className="skeleton" style={{ height: "14px", width: "88%" }} />
        <div className="skeleton" style={{ height: "14px", width: "70%" }} />
      </div>

      <div className="glass-divider" style={{ marginBottom: "20px" }} />

      {/* Breakdown items */}
      {[1, 2].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div className="skeleton" style={{ width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0 }} />
          <div className="skeleton" style={{ height: "13px", flex: 1 }} />
          <div className="skeleton" style={{ height: "20px", width: "64px", borderRadius: "100px", flexShrink: 0 }} />
        </div>
      ))}

      {/* Footer */}
      <p style={{
        marginTop: "20px",
        fontSize: "11px",
        color: "var(--text-muted)",
        textAlign: "center",
        letterSpacing: "0.03em",
      }}>
        Matching against Kolkata flood zone data…
      </p>
    </div>
  );
}
