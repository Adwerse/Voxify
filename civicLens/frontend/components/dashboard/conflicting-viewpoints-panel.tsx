type ConflictItem = {
  topic: string;
  position_a: string;
  position_b: string;
  split_estimate: string;
};

type ConflictingViewpointsPanelProps = {
  conflicts: ConflictItem[];
};

export function ConflictingViewpointsPanel({ conflicts }: ConflictingViewpointsPanelProps) {
  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-6 lg:col-span-3">
      <h2 className="text-xl font-light tracking-tight">Conflicting Viewpoints</h2>

      {conflicts.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No significant conflicts identified.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {conflicts.map((item, idx) => (
            <article key={`${item.topic}-${idx}`} className="rounded-xl border border-zinc-100 p-4">
              <p className="mb-3 text-sm font-medium text-zinc-700">{item.topic}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-white">{item.position_a}</span>
                <span className="text-sm text-zinc-400">vs</span>
                <span className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-900">{item.position_b}</span>
              </div>
              <p className="mt-3 text-xs text-zinc-400">Split estimate: {item.split_estimate}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
