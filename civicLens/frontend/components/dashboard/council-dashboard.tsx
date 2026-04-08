"use client";

import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";

import {
  analysePoll,
  fetchAnalytics,
  fetchPolls,
  fetchStudentReport,
  fetchVerifiedVoters,
  type StudentReport,
  type VerifiedVoter,
} from "@/lib/api";
import { CreatePollModal } from "@/components/dashboard/CreatePollModal";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DemoCard } from "@/components/dashboard/demo-card";
import { HeroSection } from "@/components/dashboard/hero-section";
import { ImpactCard } from "@/components/dashboard/impact-card";
import { ThemeCard } from "@/components/dashboard/theme-card";
import { useToast } from "@/lib/toast";

type Theme = {
  id: string;
  label: string;
  response_count: number;
  percentage?: number;
  representative_quotes?: string[];
};

type Conflict = {
  topic: string;
  position_a: string;
  position_b: string;
  split_estimate: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function BarRow({ label, value, max = 100, accent = "bg-emerald-500" }: { label: string; value: number; max?: number; accent?: string }) {
  const width = max <= 0 ? 0 : clamp((value / max) * 100, 0, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm text-zinc-600">
        <span>{label}</span>
        <span className="text-zinc-500">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-zinc-100">
        <div
          className={`h-2.5 rounded-full ${accent} transition-all duration-300 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function CouncilDashboard() {
  const { showToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [decisionText, setDecisionText] = useState("");
  const [simulated, setSimulated] = useState<{ sentimentShift: string; tradeOffs: string[]; groups: string[] } | null>(null);
  const [studentReport, setStudentReport] = useState<StudentReport | null>(null);

  const { data: polls, isLoading: pollsLoading, mutate: mutatePolls } = useSWR(["polls"], () => fetchPolls());

  useEffect(() => {
    if (!selectedPollId && polls?.[0]?.id) {
      setSelectedPollId(polls[0].id);
    }
  }, [polls, selectedPollId]);

  const pollId = selectedPollId || polls?.[0]?.id || "1";
  const currentPoll = (polls || []).find((item) => item.id === pollId);

  const { data: analytics, isLoading: analyticsLoading, mutate: mutateAnalytics } = useSWR(
    ["analytics", pollId],
    () => fetchAnalytics(pollId),
    { shouldRetryOnError: false }
  );

  const { data: verifiedVoters = [] } = useSWR(
    ["verified-voters", pollId],
    () => fetchVerifiedVoters(pollId),
    { shouldRetryOnError: false }
  );

  const themes = useMemo<Theme[]>(() => {
    if (!Array.isArray(analytics?.top_themes)) return [];
    return analytics.top_themes as Theme[];
  }, [analytics]);

  const conflicts = useMemo<Conflict[]>(() => {
    if (!Array.isArray(analytics?.conflicting_viewpoints)) return [];
    return analytics.conflicting_viewpoints.map((item: Record<string, unknown>, idx: number) => {
      const source = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
      return {
        topic: String(source.topic ?? `Tension ${idx + 1}`),
        position_a: String(source.position_a ?? "Position A"),
        position_b: String(source.position_b ?? "Position B"),
        split_estimate: String(source.split_estimate ?? "roughly equal"),
      };
    });
  }, [analytics]);

  const totalResponses = analytics?.participation?.total_responses ?? 0;
  const topTheme = themes[0]?.label || "Not available yet";
  const sentimentDistribution = analytics?.sentiment_distribution || { positive: 0, neutral: 0, negative: 0 };
  const responsesPerAge = analytics?.participation?.responses_per_age_band || {};
  const responsesPerGroup = analytics?.participation?.responses_per_group || {};
  const missingGroups =
    (analytics?.missing_voices as { underrepresented_groups?: Array<{ group: string; gap: number }> })?.underrepresented_groups || [];
  const voterPreview = (verifiedVoters as VerifiedVoter[]).slice(0, 10);

  const createdAt = currentPoll?.created_at ? new Date(currentPoll.created_at).getTime() : Date.now();
  const generatedAt = analytics?.generated_at ? new Date(analytics.generated_at).getTime() : Date.now();
  const liveSeconds = clamp(Math.round((generatedAt - createdAt) / 1000), 8, 120);

  const participationRate = useMemo(() => {
    const deltaPct = analytics?.trend_indicators?.response_delta_pct ?? 0;
    if (deltaPct !== 0) return clamp(Math.round(50 + deltaPct), 1, 100);
    return clamp(Math.round(totalResponses * 1.8), 1, 100);
  }, [analytics?.trend_indicators?.response_delta_pct, totalResponses]);

  if (pollsLoading || analyticsLoading) {
    return (
      <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
        <div className="mx-auto w-full max-w-6xl">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }

  async function handleAnalyse() {
    try {
      setAnalysing(true);
      await analysePoll(pollId);
      await mutateAnalytics();
      showToast("Simulation refreshed", "success");
    } catch {
      showToast("Simulation failed. Check API key and backend.", "error");
    } finally {
      setAnalysing(false);
    }
  }

  async function handleLoadStudentReport() {
    try {
      const report = await fetchStudentReport(pollId);
      setStudentReport(report);
      showToast("Student report loaded", "success");
    } catch {
      showToast("Student report unavailable", "error");
    }
  }

  function handleSimulateImpact() {
    if (!decisionText.trim()) {
      showToast("Enter a proposed decision first", "error");
      return;
    }

    const optimistic = /(improv|support|extend|invest|increase|access|upgrade)/i.test(decisionText);
    const shift = optimistic ? "+8% positive" : "-3% positive";
    const groups = (analytics?.impact?.affected_groups || []).slice(0, 3);
    const tradeOffs = (analytics?.impact?.trade_offs || []).slice(0, 3);

    setSimulated({
      sentimentShift: shift,
      tradeOffs,
      groups,
    });
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm text-zinc-400">Voxify demo</p>
            <span className="h-1 w-1 rounded-full bg-zinc-300" />
            <p className="text-sm text-zinc-400">Council view</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pollId}
              onChange={(e) => setSelectedPollId(e.target.value)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition duration-200 ease-out hover:opacity-90"
            >
              {(polls || []).map((poll) => (
                <option key={poll.id} value={poll.id}>
                  {poll.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition duration-200 ease-out hover:scale-[1.02] hover:opacity-90"
            >
              <Plus size={14} /> New poll
            </button>
          </div>
        </div>

        <HeroSection
          title="What students are saying"
          subtitle={`${totalResponses} responses collected in ${liveSeconds} seconds`}
          analysing={analysing}
          onRunSimulation={handleAnalyse}
        />

        <section className="space-y-3">
          <h2 className="text-xl font-light tracking-tight text-zinc-900">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DemoCard title="Total responses">
              <p className="text-3xl font-light tracking-tight text-zinc-900">{totalResponses}</p>
            </DemoCard>
            <DemoCard title="Top theme">
              <p className="text-base text-zinc-800">{topTheme}</p>
            </DemoCard>
            <DemoCard title="How students feel">
              <p className="text-sm text-zinc-700">
                {Math.round(sentimentDistribution.positive)}% positive, {Math.round(sentimentDistribution.neutral)}% neutral
              </p>
              <div className="mt-3 flex gap-1">
                <div className="h-2 flex-1 rounded-full bg-emerald-500" style={{ opacity: 0.9 }} />
                <div className="h-2 flex-1 rounded-full bg-zinc-400" style={{ opacity: 0.7 }} />
                <div className="h-2 flex-1 rounded-full bg-zinc-700" style={{ opacity: 0.5 }} />
              </div>
            </DemoCard>
            <DemoCard title="Participation rate">
              <p className="text-3xl font-light tracking-tight text-zinc-900">{participationRate}%</p>
            </DemoCard>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-xl font-light tracking-tight text-zinc-900">Key insights</h2>
            <button
              type="button"
              onClick={handleLoadStudentReport}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition duration-200 ease-out hover:scale-[1.02] hover:opacity-90"
            >
              Load student report
            </button>
          </div>

          <div className="space-y-3">
            {themes.slice(0, 4).map((theme) => (
              <ThemeCard
                key={theme.id}
                title={theme.label}
                percentage={Math.round(theme.percentage || 0)}
                insight={`${theme.response_count} students mentioned this. This is one of the strongest live signals in the consultation.`}
                quote={theme.representative_quotes?.[0] || "No quote captured yet."}
              />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {conflicts.slice(0, 2).map((conflict, idx) => (
              <article
                key={`${conflict.topic}-${idx}`}
                className="rounded-2xl border border-zinc-200 bg-zinc-900 p-4 text-zinc-100 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-400">Students want X, but also Y</p>
                <p className="mt-2 text-base font-medium">{conflict.topic}</p>
                <p className="mt-2 text-sm text-zinc-300">{conflict.position_a}</p>
                <p className="mt-1 text-sm text-zinc-300">{conflict.position_b}</p>
              </article>
            ))}
          </div>

          {studentReport ? (
            <details className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition duration-200 ease-out">
              <summary className="cursor-pointer list-none text-sm font-medium text-zinc-800">Student report snapshot</summary>
              <p className="mt-3 text-sm text-zinc-600">{studentReport.what_students_said}</p>
              <p className="mt-2 text-sm text-zinc-500">{studentReport.sentiment_summary}</p>
            </details>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-light tracking-tight text-zinc-900">Who responded</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <DemoCard title="Age bands" subtitle="Clean participation bars">
              <div className="space-y-3">
                {Object.entries(responsesPerAge).map(([band, value]) => (
                  <BarRow key={band} label={band} value={Number(value)} max={Math.max(...Object.values(responsesPerAge), 1)} accent="bg-emerald-500" />
                ))}
              </div>
            </DemoCard>

            <DemoCard title="Groups" subtitle="Who is represented right now">
              <div className="space-y-3">
                {Object.entries(responsesPerGroup)
                  .slice(0, 5)
                  .map(([group, value]) => (
                    <BarRow key={group} label={group} value={Number(value)} max={Math.max(...Object.values(responsesPerGroup), 1)} accent="bg-zinc-800" />
                  ))}
              </div>
            </DemoCard>
          </div>

          <DemoCard
            title="Verified emoji voters"
            subtitle={`${verifiedVoters.length} verified identities linked to this poll`}
          >
            <div className="space-y-2">
              {voterPreview.length === 0 ? (
                <p className="text-sm text-zinc-500">No verified emoji voters yet.</p>
              ) : (
                voterPreview.map((voter) => (
                  <div key={voter.emoji_id} className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2">
                    <p className="text-sm text-zinc-900">{voter.emoji_id}</p>
                    <p className="text-xs text-zinc-500">{voter.demographic_band} · ✓</p>
                  </div>
                ))
              )}
            </div>
          </DemoCard>

          {missingGroups.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
              <p className="inline-flex items-center gap-2 text-sm font-medium"><AlertTriangle size={16} /> Low participation warning</p>
              <p className="mt-1 text-sm">
                Low participation from {missingGroups.slice(0, 2).map((item) => item.group).join(" and ")}. Consider targeted outreach.
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-800/20 bg-zinc-900 px-5 py-6 text-zinc-100 shadow-md sm:px-6">
          <h2 className="text-xl font-light tracking-tight">Decision impact</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              placeholder="Proposed decision"
              className="h-11 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition duration-200 ease-out focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleSimulateImpact}
              className="h-11 rounded-2xl bg-emerald-500 px-5 text-sm font-medium text-zinc-950 transition duration-200 ease-out hover:scale-[1.02] hover:opacity-90"
            >
              Simulate impact
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ImpactCard title="Affected groups" items={simulated?.groups || (analytics?.impact?.affected_groups || []).slice(0, 3)} />
            <ImpactCard title="Sentiment shift" items={simulated ? [simulated.sentimentShift] : ["Run simulation to estimate shift"]} />
            <ImpactCard title="Trade-offs" items={simulated?.tradeOffs || (analytics?.impact?.trade_offs || []).slice(0, 3)} />
          </div>
        </section>
      </div>

      <CreatePollModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newPollId) => {
          setIsCreateOpen(false);
          setSelectedPollId(newPollId);
          mutatePolls();
        }}
      />
    </main>
  );
}
