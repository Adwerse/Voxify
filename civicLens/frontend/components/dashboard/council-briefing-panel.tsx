type Briefing = {
  executive_summary: string;
  key_findings: string[];
  trade_offs: string[];
  recommended_next_steps: string[];
  data_caveats: string[];
};

type CouncilBriefingPanelProps = {
  briefing: Briefing;
};

export function CouncilBriefingPanel({ briefing }: CouncilBriefingPanelProps) {
  return (
    <section className="rounded-2xl bg-zinc-950 p-6 text-white lg:col-span-2">
      <h2 className="text-xl font-light tracking-tight">Council Briefing Export</h2>
      <p className="mt-3 text-sm text-zinc-300">{briefing.executive_summary || "Briefing summary unavailable."}</p>

      <ul className="mt-4 space-y-2 text-sm text-white">
        {(briefing.key_findings || []).map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-zinc-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <button className="mt-5 rounded-full border border-zinc-600 px-6 py-2 text-sm text-white transition hover:bg-zinc-800">
        Download PDF
      </button>
    </section>
  );
}
