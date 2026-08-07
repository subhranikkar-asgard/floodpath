export default function LoadingState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-7 w-24 rounded-full bg-slate-200" />
        <div className="h-4 w-40 rounded bg-slate-200" />
      </div>
      <div className="space-y-2 mb-5">
        <div className="h-4 w-full rounded bg-slate-200" />
        <div className="h-4 w-5/6 rounded bg-slate-200" />
        <div className="h-4 w-4/6 rounded bg-slate-200" />
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="h-4 flex-1 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-slate-400 text-center">
        Assessing flood risk against grounding data…
      </p>
    </div>
  );
}
