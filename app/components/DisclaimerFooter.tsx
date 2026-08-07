export default function DisclaimerFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 px-4 py-4">
      <div className="mx-auto max-w-2xl">
        <p className="text-[11px] text-slate-500 leading-relaxed text-center">
          <span className="font-semibold text-slate-600">⚠ Safety Notice:</span>{" "}
          Risk assessments are based on historical baseline data compiled from public monsoon
          reporting (2021–2026) — not a real-time feed. Dataset is illustrative; for production
          use it would be replaced with the official KMC drainage department feed. Always verify
          with KMC or local authorities before travelling during active heavy rainfall.
          In an emergency, contact NDRF or local civil defence.
        </p>
      </div>
    </footer>
  );
}
