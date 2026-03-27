import { AlertTriangle } from "lucide-react";

type UnderrepresentedGroup = {
  group: string;
  institution_share: number;
  response_share: number;
  gap: number;
  affected_themes?: string[];
  equity_note: string;
};

type MissingVoicesPanelProps = {
  representationHealth: string;
  groups: UnderrepresentedGroup[];
};

export function MissingVoicesPanel({ representationHealth, groups }: MissingVoicesPanelProps) {
  if (representationHealth === "unknown") {
    return (
      <section className="rounded-2xl border border-zinc-100 bg-white p-6 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-xl font-light tracking-tight">Missing Voices</h2>
        </div>
        <p className="text-sm text-zinc-500">Add demographic baseline to unlock this panel</p>
        <button className="mt-4 rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-800">
          Configure baseline
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-6 lg:col-span-2">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h2 className="text-xl font-light tracking-tight">Missing Voices</h2>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-zinc-500">No underrepresented groups detected.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <article key={group.group} className="rounded-xl border border-zinc-100 p-4">
              <p className="font-medium text-zinc-900">{group.group}</p>

              <div className="mt-3 space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-zinc-500">
                    <span>Institution share</span>
                    <span>{group.institution_share}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-200">
                    <div className="h-2 rounded-full bg-zinc-300" style={{ width: `${group.institution_share}%` }} />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-zinc-500">
                    <span>Response share</span>
                    <span>{group.response_share}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-200">
                    <div className="h-2 rounded-full bg-zinc-950" style={{ width: `${group.response_share}%` }} />
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm italic text-zinc-500">{group.equity_note}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
