"use client";

import { useMemo, useState } from "react";
import { BarChart2 } from "lucide-react";

export type ThemeItem = {
  id: string;
  label: string;
  response_count: number;
  percentage?: number;
  representative_quotes?: string[];
};

type ThemeBreakdownPanelProps = {
  themes: ThemeItem[];
  onRunAnalysis?: () => void;
  analysing?: boolean;
};

export function ThemeBreakdownPanel({ themes, onRunAnalysis, analysing = false }: ThemeBreakdownPanelProps) {
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(themes[0]?.id ?? null);

  const selectedTheme = useMemo(
    () => themes.find((item) => item.id === selectedThemeId) ?? themes[0],
    [selectedThemeId, themes]
  );

  if (!themes.length) {
    return (
      <section className="rounded-2xl border border-zinc-100 bg-white p-6 lg:col-span-3">
        <h2 className="text-xl font-light tracking-tight text-zinc-900">Theme Breakdown</h2>
        <div className="mt-6 flex min-h-64 flex-col items-center justify-center text-center">
          <BarChart2 size={32} className="text-zinc-200" />
          <p className="mt-3 text-base font-medium">No analysis yet</p>
          <button
            onClick={onRunAnalysis}
            disabled={analysing}
            className="mt-2 text-sm text-zinc-400 underline underline-offset-4 disabled:opacity-50"
          >
            {analysing ? "Analysing..." : "Analyse ->"}
          </button>
        </div>
      </section>
    );
  }

  const max = Math.max(...themes.map((item) => item.response_count), 1);

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-6 lg:col-span-3">
      <h2 className="text-xl font-light tracking-tight text-zinc-900">Theme Breakdown</h2>

      <div className="mt-5 space-y-4">
        {themes.map((item) => {
          const pct = item.percentage ?? Math.round((item.response_count / max) * 100);
          const width = Math.max(8, Math.round((item.response_count / max) * 100));
          const showInside = width > 40;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedThemeId(item.id)}
              className="w-full text-left"
              type="button"
            >
              <p className="text-sm font-medium text-zinc-800">{item.label}</p>
              <p className="text-xs text-zinc-400">{item.response_count} responses</p>
              <div className="mt-2 relative h-8 rounded-full bg-zinc-100">
                <div
                  className="flex h-8 items-center rounded-full bg-zinc-950 px-3"
                  style={{ width: `${width}%` }}
                >
                  {showInside ? <span className="ml-auto text-xs text-white">{pct}%</span> : null}
                </div>
                {!showInside ? <span className="absolute right-3 top-2 text-xs text-zinc-400">{pct}%</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-zinc-50 p-4">
        <p className="text-sm text-zinc-500">Representative quotes</p>
        {selectedTheme?.representative_quotes?.length ? (
          <ul className="mt-2 space-y-2">
            {selectedTheme.representative_quotes.slice(0, 2).map((quote: string, idx: number) => (
              <li key={idx} className="text-sm text-zinc-700">
                "{quote}"
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Select a bar to view representative quotes.</p>
        )}
      </div>
    </section>
  );
}
