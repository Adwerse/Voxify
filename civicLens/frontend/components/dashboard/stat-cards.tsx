type StatCardsProps = {
  totalResponses: number;
  themesCount: number;
  representationHealth: string;
};

function healthDotClass(health: string): string {
  const value = health.toLowerCase();
  if (value === "good") return "bg-emerald-500";
  if (value === "moderate") return "bg-amber-500";
  if (value === "poor") return "bg-red-500";
  return "bg-zinc-500";
}

export function StatCards({ totalResponses, themesCount, representationHealth }: StatCardsProps) {
  const healthValue = representationHealth.toLowerCase();
  const showUnknownHint = healthValue === "unknown";

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-2xl bg-zinc-950 p-6 text-white">
        <p className="text-sm text-zinc-400">Total Responses</p>
        <p className="mt-4 text-4xl font-light tracking-tight">{totalResponses}</p>
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500">Minimum 20 responses recommended before analysis</p>
        </div>
      </article>

      <article className="rounded-2xl bg-zinc-950 p-6 text-white">
        <p className="text-sm text-zinc-400">Themes Identified</p>
        <p className="mt-4 text-4xl font-light tracking-tight">{themesCount}</p>
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500">Based on last analysis run</p>
        </div>
      </article>

      <article className="rounded-2xl bg-zinc-950 p-6 text-white">
        <p className="text-sm text-zinc-400">Representation Health</p>
        <div className="mt-5 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${healthDotClass(representationHealth)}`} />
          <p className="text-4xl font-light tracking-tight capitalize">{representationHealth}</p>
        </div>
        {showUnknownHint ? <p className="mt-2 text-xs text-zinc-500">Add baseline to unlock</p> : null}
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500">Compared to institution demographics</p>
        </div>
      </article>
    </section>
  );
}
