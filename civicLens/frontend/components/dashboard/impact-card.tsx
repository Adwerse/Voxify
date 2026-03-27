type ImpactCardProps = {
  title: string;
  items: string[];
};

export function ImpactCard({ title, items }: ImpactCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-700/20 bg-zinc-800/95 p-5 text-zinc-100 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs uppercase tracking-wide text-zinc-300">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {items.length === 0 ? (
          <li className="text-zinc-400">No signal yet.</li>
        ) : (
          items.map((item, idx) => (
            <li key={`${item}-${idx}`} className="rounded-xl bg-zinc-700/40 px-3 py-2 text-zinc-100">
              {item}
            </li>
          ))
        )}
      </ul>
    </article>
  );
}
