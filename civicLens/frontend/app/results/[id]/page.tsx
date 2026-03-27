"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { analysePoll, fetchAnalysis, fetchPoll, fetchResponseStats, fetchTokenOutcome } from "@/lib/api";

type ResultsPageProps = {
  params: {
    id: string;
  };
};

export default function ResultsPage({ params }: ResultsPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof fetchAnalysis>> | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [responseCount, setResponseCount] = useState(0);
  const [noResponsesYet, setNoResponsesYet] = useState(false);
  const [token, setToken] = useState("");
  const [checking, setChecking] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [outcome, setOutcome] = useState<Awaited<ReturnType<typeof fetchTokenOutcome>> | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    Promise.all([fetchPoll(params.id), fetchResponseStats(params.id)])
      .then(async ([pollData, statsData]) => {
        if (!mounted) return;
        setPollQuestion(pollData.question);
        setResponseCount(statsData.response_count);

        if (statsData.response_count === 0) {
          setNoResponsesYet(true);
          setAnalysis(null);
          return;
        }

        try {
          const analysisData = await fetchAnalysis(params.id);
          if (!mounted) return;
          setAnalysis(analysisData);
        } catch {
          // If analysis does not exist yet for a poll with responses, trigger generation once.
          await analysePoll(params.id);
          const analysisData = await fetchAnalysis(params.id);
          if (!mounted) return;
          setAnalysis(analysisData);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError("We could not load results right now.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params.id]);

  const themes = useMemo(() => {
    const raw = analysis?.themes;
    const entries = raw && typeof raw === "object" ? (raw as { themes?: unknown }).themes : undefined;
    if (!Array.isArray(entries)) return [];
    return entries.slice(0, 4).map((item, idx) => {
      const source = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
      const ageBandBreakdown =
        source.age_band_breakdown && typeof source.age_band_breakdown === "object"
          ? (source.age_band_breakdown as Record<string, number>)
          : {};
      const topAgeBand = Object.entries(ageBandBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || "students";

      return {
        id: String(source.id ?? `theme_${idx + 1}`),
        label: String(source.label ?? `Theme ${idx + 1}`),
        percentage: Number(source.percentage ?? 0),
        quote: Array.isArray(source.representative_quotes)
          ? String(source.representative_quotes[0] ?? "")
          : "",
        ageBand: topAgeBand,
      };
    });
  }, [analysis]);

  const totalResponses = useMemo(() => responseCount, [responseCount]);

  async function onCheckToken(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token.trim()) return;

    setChecking(true);
    setTokenError("");
    setOutcome(null);

    try {
      const result = await fetchTokenOutcome(params.id, token.trim());
      setOutcome(result);
    } catch {
      setTokenError("Token not found or unavailable.");
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-lg">
          <div className="h-6 w-3/4 animate-pulse rounded-xl bg-zinc-100" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-500">
          {error}
        </div>
      </main>
    );
  }

  if (noResponsesYet) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-6">
          <h1 className="text-xl font-light tracking-tight">{pollQuestion || "Poll"}</h1>
          <p className="mt-3 text-sm text-zinc-600">
            No responses yet. Once students submit feedback, analysis will appear here.
          </p>
          <a href={`/poll/${params.id}`} className="mt-4 inline-block rounded-full bg-black px-5 py-2 text-sm text-white">
            Open Poll
          </a>
        </div>
      </main>
    );
  }

  if (!analysis) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          Analysis is being generated. Refresh this page in a few seconds.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto max-w-lg">
        <header>
          <h1 className="text-xl font-light tracking-tight">{pollQuestion || "Poll"}</h1>
          <p className="mt-2 text-sm text-zinc-400">{totalResponses} students responded</p>
        </header>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-medium">What your peers said</h2>
          {themes.map((theme) => (
            <article key={theme.id} className="mb-3 rounded-2xl border border-zinc-100 p-4">
              <p className="font-medium text-zinc-900">{theme.label}</p>
              <div className="mt-2 h-1.5 rounded-full bg-zinc-100">
                <div className="h-1.5 rounded-full bg-zinc-950" style={{ width: `${theme.percentage}%` }} />
              </div>
              {theme.quote ? (
                <p className="mt-3 text-sm italic text-zinc-500">"{theme.quote}"</p>
              ) : (
                <p className="mt-3 text-sm italic text-zinc-500">No representative quote available.</p>
              )}
              <p className="mt-1 text-xs text-zinc-400">- shared by {theme.ageBand}</p>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <label className="mb-2 block text-sm text-zinc-700">
            Enter your follow-up token to see if your input influenced a decision
          </label>

          <form onSubmit={onCheckToken} className="flex items-center gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 p-3 font-mono"
              placeholder="paste token"
            />
            <button type="submit" className="rounded-full bg-black px-6 py-2 text-white" disabled={checking}>
              {checking ? "..." : "Check"}
            </button>
          </form>

          {tokenError ? <p className="mt-2 text-sm text-red-500">{tokenError}</p> : null}

          {outcome && !outcome.decision_made ? (
            <div className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
              No decision has been made yet. We&apos;ll update this page when it does.
            </div>
          ) : null}

          {outcome && outcome.decision_made && outcome.influenced_by_input ? (
            <div className="mt-4 rounded-2xl bg-zinc-950 p-4 text-sm text-white">
              <p className="font-medium">A decision was made. Your input contributed.</p>
              <p className="mt-2 text-zinc-300">{outcome.decision_text}</p>
            </div>
          ) : null}

          {outcome && outcome.decision_made && !outcome.influenced_by_input ? (
            <div className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
              <p className="font-medium">
                A decision was made. Decision-makers provided this reason for not following this input:
              </p>
              <p className="mt-2">{outcome.decision_text}</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
