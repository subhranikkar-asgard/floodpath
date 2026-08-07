export default function DisclaimerFooter() {
  return (
    <footer style={{
      borderTop: "1px solid var(--glass-border)",
      background: "rgba(6,11,24,0.7)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      padding: "16px 20px",
    }}>
      <p style={{
        maxWidth: "720px",
        margin: "0 auto",
        fontSize: "11px",
        color: "var(--text-muted)",
        lineHeight: "1.6",
        textAlign: "center",
      }}>
        <span style={{ color: "rgba(251,191,36,0.7)", fontWeight: 600 }}>⚠ Safety Notice:</span>{" "}
        Risk assessments are based on historical baseline data from public monsoon reporting
        (2021–2026) — not a real-time or official feed. For production use this would connect
        to the official KMC drainage department API. Always verify with local authorities
        before travel during active rainfall. Emergency: NDRF / local civil defence.
      </p>
    </footer>
  );
}
