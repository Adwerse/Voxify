type ThemeCardProps = {
  title: string;
  percentage: number;
  insight: string;
  quote: string;
};

export function ThemeCard({ title, percentage, insight, quote }: ThemeCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium text-zinc-900">{title}</h3>
        <span className="text-2xl font-light tracking-tight text-emerald-600">{percentage}%</span>
      </div>
      <p className="mt-2 text-sm text-zinc-600">{insight}</p>
      <blockquote className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm italic text-zinc-500">"{quote}"</blockquote>
    </article>
  );
}
