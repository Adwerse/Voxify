import { Sparkles } from "lucide-react";

type HeroSectionProps = {
  title: string;
  subtitle: string;
  analysing: boolean;
  onRunSimulation: () => void;
};

export function HeroSection({ title, subtitle, analysing, onRunSimulation }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-200 ease-out sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-100/50 blur-2xl" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live civic signal
          </div>
          <h1 className="mt-3 text-3xl font-light tracking-tight text-zinc-900">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onRunSimulation}
          disabled={analysing}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm text-white transition duration-200 ease-out hover:scale-[1.02] hover:opacity-90 disabled:opacity-60"
        >
          {analysing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-transparent" />
          ) : (
            <Sparkles size={16} />
          )}
          {analysing ? "Running…" : "Run simulation →"}
        </button>
      </div>
    </section>
  );
}
