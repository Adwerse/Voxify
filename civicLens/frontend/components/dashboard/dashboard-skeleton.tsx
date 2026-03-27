export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-36 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-100 lg:col-span-3" />
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-100 lg:col-span-2" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-80 animate-pulse rounded-2xl bg-zinc-100 lg:col-span-3" />
        <div className="h-80 animate-pulse rounded-2xl bg-zinc-100 lg:col-span-2" />
      </div>
    </div>
  );
}
