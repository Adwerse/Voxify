export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-40 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="skeleton-shimmer h-full rounded-xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-24 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="skeleton-shimmer h-full rounded-lg" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-28 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="skeleton-shimmer h-full rounded-lg" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-52 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="skeleton-shimmer h-full rounded-lg" />
        </div>
        <div className="h-52 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="skeleton-shimmer h-full rounded-lg" />
        </div>
      </div>

      <div className="h-56 rounded-2xl border border-zinc-700/20 bg-zinc-900/95 p-4 shadow-md">
        <div className="skeleton-shimmer h-full rounded-lg bg-zinc-700/50" />
      </div>
    </div>
  );
}
