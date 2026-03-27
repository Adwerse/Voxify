"use client";

import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";

import { analysePoll, fetchAnalysis, fetchPolls, fetchResponseStats, updatePollBaseline } from "@/lib/api";
import { CreatePollModal } from "@/components/dashboard/CreatePollModal";
import { CouncilBriefingPanel } from "@/components/dashboard/council-briefing-panel";
import { ConflictingViewpointsPanel } from "@/components/dashboard/conflicting-viewpoints-panel";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { MissingVoicesPanel } from "@/components/dashboard/missing-voices-panel";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ThemeBreakdownPanel } from "@/components/dashboard/theme-breakdown-panel";
import { useToast } from "@/lib/toast";

type Theme = {
  id: string;
  label: string;
  response_count: number;
  percentage?: number;
  representative_quotes?: string[];
};

type MissingVoicesData = {
  underrepresented_groups?: Array<{
    group: string;
    institution_share: number;
    response_share: number;
    gap: number;
    affected_themes?: string[];
    equity_note: string;
  }>;
  representation_health?: string;
};

type BriefingData = {
  executive_summary: string;
  key_findings: string[];
  trade_offs: string[];
  recommended_next_steps: string[];
  data_caveats: string[];
};

type Conflict = {
  topic: string;
  position_a: string;
  position_b: string;
  split_estimate: string;
};

export function CouncilDashboard() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "overview";
  const requestedPollId = searchParams.get("pollId");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [age1617, setAge1617] = useState("");
  const [age1821, setAge1821] = useState("");
  const [age22plus, setAge22plus] = useState("");
  const [savingBaseline, setSavingBaseline] = useState(false);

  const { data: polls, isLoading: pollsLoading, mutate: mutatePolls } = useSWR(["polls"], () => fetchPolls());
  const pollId = requestedPollId || polls?.[0]?.id || "1";
  const currentPoll = (polls || []).find((item) => item.id === pollId);

  const { data: stats, mutate: mutateStats } = useSWR(["responses", pollId], () => fetchResponseStats(pollId));
  const { data, error, isLoading, mutate: mutateAnalysis } = useSWR(
    ["analysis", pollId],
    () => fetchAnalysis(pollId),
    { shouldRetryOnError: false }
  );

  useEffect(() => {
    if (!currentPoll) return;
    setAge1617(String(currentPoll.institution_demographics?.["16-17"] ?? ""));
    setAge1821(String(currentPoll.institution_demographics?.["18-21"] ?? ""));
    setAge22plus(String(currentPoll.institution_demographics?.["22+"] ?? ""));
  }, [currentPoll]);

  const themes = useMemo<Theme[]>(() => {
    const raw = data?.themes;
    if (!raw || typeof raw !== "object") return [];

    const maybeArray = (raw as { themes?: unknown }).themes;
    if (!Array.isArray(maybeArray)) return [];

    return maybeArray.map((item, idx) => {
      const source = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
      return {
        id: String(source.id ?? `theme_${idx + 1}`),
        label: String(source.label ?? `Theme ${idx + 1}`),
        response_count: Number(source.response_count ?? 0),
        percentage: Number(source.percentage ?? 0),
        representative_quotes: Array.isArray(source.representative_quotes)
          ? source.representative_quotes.map((quote) => String(quote))
          : [],
      };
    });
  }, [data]);

  const missingVoices = useMemo<MissingVoicesData>(() => {
    const raw = data?.missing_voices;
    if (!raw || typeof raw !== "object") return { representation_health: "unknown", underrepresented_groups: [] };
    return raw as MissingVoicesData;
  }, [data]);

  const conflicts = useMemo<Conflict[]>(() => {
    if (!Array.isArray(data?.conflicting_viewpoints)) return [];
    return data.conflicting_viewpoints.map((item: Record<string, unknown>, idx: number) => {
      const source = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
      return {
        topic: String(source.topic ?? `Conflict ${idx + 1}`),
        position_a: String(source.position_a ?? "Position A"),
        position_b: String(source.position_b ?? "Position B"),
        split_estimate: String(source.split_estimate ?? "roughly equal"),
      };
    });
  }, [data]);

  const briefing = useMemo<BriefingData>(() => {
    const sentiment = data?.sentiment_summary;
    if (!sentiment || typeof sentiment !== "object") {
      return {
        executive_summary: "Briefing unavailable.",
        key_findings: [],
        trade_offs: [],
        recommended_next_steps: [],
        data_caveats: [],
      };
    }

    const source = (sentiment as { council_briefing?: unknown }).council_briefing;
    if (!source || typeof source !== "object") {
      return {
        executive_summary: "Briefing unavailable.",
        key_findings: [],
        trade_offs: [],
        recommended_next_steps: [],
        data_caveats: [],
      };
    }

    const value = source as Record<string, unknown>;
    return {
      executive_summary: String(value.executive_summary ?? "Briefing unavailable."),
      key_findings: Array.isArray(value.key_findings) ? value.key_findings.map((v) => String(v)) : [],
      trade_offs: Array.isArray(value.trade_offs) ? value.trade_offs.map((v) => String(v)) : [],
      recommended_next_steps: Array.isArray(value.recommended_next_steps)
        ? value.recommended_next_steps.map((v) => String(v))
        : [],
      data_caveats: Array.isArray(value.data_caveats) ? value.data_caveats.map((v) => String(v)) : [],
    };
  }, [data]);

  const totalResponses = useMemo(
    () => stats?.response_count ?? themes.reduce((acc: number, item: Theme) => acc + item.response_count, 0),
    [stats, themes]
  );
  const representationHealth = missingVoices.representation_health || "unknown";
  const underrepresentedGroups = missingVoices.underrepresented_groups || [];

  if (pollsLoading || isLoading) {
    return (
      <div className="flex min-h-screen bg-zinc-50">
        <DashboardSidebar />
        <main className="min-h-screen flex-1 bg-zinc-50 p-8">
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  const hasAnalysis = !error && !!data;

  function openSection(nextSection: string) {
    router.push(`/dashboard?section=${nextSection}&pollId=${pollId}`);
  }

  async function handleAnalyse() {
    try {
      setAnalysing(true);
      await analysePoll(pollId);
      await Promise.all([mutateAnalysis(), mutateStats()]);
      setAnalysisSuccess(true);
      showToast("Analysis complete", "success");
      setTimeout(() => setAnalysisSuccess(false), 1200);
    } catch {
      showToast("Analysis failed - check API key", "error");
    } finally {
      setAnalysing(false);
    }
  }

  async function handleSaveBaseline() {
    const payload = {
      "16-17": Number(age1617 || 0),
      "18-21": Number(age1821 || 0),
      "22+": Number(age22plus || 0),
    };
    try {
      setSavingBaseline(true);
      await updatePollBaseline(pollId, payload);
      await mutatePolls();
      showToast("Baseline saved", "success");
    } catch {
      showToast("Could not save baseline", "error");
    } finally {
      setSavingBaseline(false);
    }
  }

  const baselineConfigured =
    (Number(age1617 || 0) + Number(age1821 || 0) + Number(age22plus || 0)) > 0;

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <DashboardSidebar />
      <main className="min-h-screen flex-1 bg-zinc-50 p-4 sm:p-8">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">Voxify</p>
              <h1 className="text-2xl font-light tracking-tight">Council Dashboard</h1>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pollId}
                onChange={(e) => router.push(`/dashboard?section=${section}&pollId=${e.target.value}`)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                {(polls || []).map((poll) => (
                  <option key={poll.id} value={poll.id}>
                    {poll.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAnalyse}
                disabled={analysing}
                className={`rounded-full border px-4 py-2 text-sm ${analysisSuccess ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-white"}`}
              >
                <span className="inline-flex items-center gap-2">
                  {analysing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-700 border-t-transparent" /> : <Sparkles size={16} />}
                  {analysing ? "Analysing..." : "Analyse"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-full bg-black px-5 py-2 text-sm text-white"
              >
                New Poll
              </button>
            </div>
          </header>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openSection("overview")}
              className={`rounded-full px-4 py-2 text-sm ${section === "overview" ? "bg-black text-white" : "bg-white border border-zinc-200 text-zinc-700"}`}
            >
              Overview
            </button>
            <button
              onClick={() => openSection("participants")}
              className={`rounded-full px-4 py-2 text-sm ${section === "participants" ? "bg-black text-white" : "bg-white border border-zinc-200 text-zinc-700"}`}
            >
              Participants
            </button>
            <button
              onClick={() => openSection("settings")}
              className={`rounded-full px-4 py-2 text-sm ${section === "settings" ? "bg-black text-white" : "bg-white border border-zinc-200 text-zinc-700"}`}
            >
              Settings
            </button>
          </div>

          {section === "overview" ? (
            <>
              <StatCards
                totalResponses={totalResponses}
                themesCount={themes.length}
                representationHealth={representationHealth}
              />

              <section className="grid gap-6 lg:grid-cols-5">
                <ThemeBreakdownPanel themes={hasAnalysis ? themes : []} onRunAnalysis={handleAnalyse} analysing={analysing} />
                <MissingVoicesPanel representationHealth={representationHealth} groups={underrepresentedGroups} />
              </section>

              <section className="grid gap-6 lg:grid-cols-5">
                <ConflictingViewpointsPanel conflicts={conflicts} />
                <CouncilBriefingPanel briefing={briefing} />
              </section>
            </>
          ) : null}

          {section === "participants" ? (
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-100 bg-white p-6">
                <p className="text-sm text-zinc-400">Total participants</p>
                <p className="mt-2 text-4xl font-light tracking-tight">{stats?.response_count ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-6">
                <p className="text-sm text-zinc-400">Age band distribution</p>
                <div className="mt-3 space-y-2">
                  {Object.entries(stats?.age_band_distribution || {}).map(([band, count]) => (
                    <div key={band} className="flex items-center justify-between text-sm">
                      <span>{band}</span>
                      <span className="text-zinc-500">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {section === "settings" ? (
            <section className="rounded-2xl border border-zinc-100 bg-white p-6">
              <h2 className="text-xl font-medium">Poll Settings</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-zinc-400">Question</p>
                  <p className="mt-1 rounded-xl border border-zinc-200 p-3 text-sm">{currentPoll?.question || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Mode</p>
                  <span className="mt-1 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                    {currentPoll?.mode === "under16" ? "Under 16" : "Standard"}
                  </span>
                </div>

                {!baselineConfigured ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    Missing Voices accuracy is limited without a baseline.
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 text-sm font-medium">Demographic baseline</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs text-zinc-500">
                      16-17%
                      <input
                        value={age1617}
                        onChange={(e) => setAge1617(e.target.value)}
                        type="number"
                        min={0}
                        max={100}
                        className="mt-1 w-full rounded-xl border border-zinc-200 p-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-zinc-500">
                      18-21%
                      <input
                        value={age1821}
                        onChange={(e) => setAge1821(e.target.value)}
                        type="number"
                        min={0}
                        max={100}
                        className="mt-1 w-full rounded-xl border border-zinc-200 p-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-zinc-500">
                      22+%
                      <input
                        value={age22plus}
                        onChange={(e) => setAge22plus(e.target.value)}
                        type="number"
                        min={0}
                        max={100}
                        className="mt-1 w-full rounded-xl border border-zinc-200 p-2 text-sm"
                      />
                    </label>
                  </div>
                  <button
                    onClick={handleSaveBaseline}
                    disabled={savingBaseline}
                    className="mt-4 rounded-full bg-black px-5 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {savingBaseline ? "Saving..." : "Save baseline"}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <a href={`/poll/${pollId}`} className="rounded-xl border border-zinc-200 p-4 text-sm">
                    Open poll page
                  </a>
                  <a href={`/results/${pollId}`} className="rounded-xl border border-zinc-200 p-4 text-sm">
                    Open results page
                  </a>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <CreatePollModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newPollId) => {
            setIsCreateOpen(false);
            router.push(`/dashboard?section=overview&pollId=${newPollId}`);
          }}
        />
      </main>
    </div>
  );
}
