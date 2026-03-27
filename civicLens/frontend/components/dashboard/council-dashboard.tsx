"use client";

import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, FileText, Sparkles } from "lucide-react";

import {
  analysePoll,
  fetchAnalytics,
  fetchInstitutionalReport,
  fetchPolls,
  fetchResponseStats,
  fetchStudentReport,
  type InstitutionalReport,
  type StudentReport,
  updatePollBaseline,
} from "@/lib/api";
import { CreatePollModal } from "@/components/dashboard/CreatePollModal";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { useToast } from "@/lib/toast";

type Theme = {
  id: string;
  label: string;
  response_count: number;
  percentage?: number;
  representative_quotes?: string[];
  age_band_breakdown?: Record<string, number>;
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
  const [studentReport, setStudentReport] = useState<StudentReport | null>(null);
  const [institutionalReport, setInstitutionalReport] = useState<InstitutionalReport | null>(null);
  const [loadingStudentReport, setLoadingStudentReport] = useState(false);
  const [loadingInstitutionalReport, setLoadingInstitutionalReport] = useState(false);

  const { data: polls, isLoading: pollsLoading, mutate: mutatePolls } = useSWR(["polls"], () => fetchPolls());
  const pollId = requestedPollId || polls?.[0]?.id || "1";
  const currentPoll = (polls || []).find((item) => item.id === pollId);

  const { data: stats, mutate: mutateStats } = useSWR(["responses", pollId], () => fetchResponseStats(pollId));
  const { data: analytics, error, isLoading, mutate: mutateAnalytics } = useSWR(
    ["analytics", pollId],
    () => fetchAnalytics(pollId),
    { shouldRetryOnError: false }
  );

  useEffect(() => {
    if (!currentPoll) return;
    setAge1617(String(currentPoll.institution_demographics?.["16-17"] ?? ""));
    setAge1821(String(currentPoll.institution_demographics?.["18-21"] ?? ""));
    setAge22plus(String(currentPoll.institution_demographics?.["22+"] ?? ""));
  }, [currentPoll]);

  const themes = useMemo<Theme[]>(() => {
    if (!Array.isArray(analytics?.top_themes)) return [];
    return analytics.top_themes as Theme[];
  }, [analytics]);

  const conflicts = useMemo<Conflict[]>(() => {
    if (!Array.isArray(analytics?.conflicting_viewpoints)) return [];
    return analytics.conflicting_viewpoints.map((item: Record<string, unknown>, idx: number) => {
      const source = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
      return {
        topic: String(source.topic ?? `Conflict ${idx + 1}`),
        position_a: String(source.position_a ?? "Position A"),
        position_b: String(source.position_b ?? "Position B"),
        split_estimate: String(source.split_estimate ?? "roughly equal"),
      };
    });
  }, [analytics]);

  const totalResponses = useMemo(
    () => analytics?.participation?.total_responses ?? stats?.response_count ?? themes.reduce((acc: number, item: Theme) => acc + item.response_count, 0),
    [stats, themes]
  );
  const underrepresentedGroups =
    (analytics?.missing_voices as { underrepresented_groups?: Array<{ group: string; gap: number; equity_note?: string }> })
      ?.underrepresented_groups || [];
  const responsesPerGroup = analytics?.participation?.responses_per_group || {};
  const trend = analytics?.trend_indicators;
  const sentimentDistribution = analytics?.sentiment_distribution || { positive: 0, neutral: 0, negative: 0 };
  const impact = analytics?.impact;

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

  const hasAnalysis = !error && !!analytics;

  function openSection(nextSection: string) {
    router.push(`/dashboard?section=${nextSection}&pollId=${pollId}`);
  }

  async function handleAnalyse() {
    try {
      setAnalysing(true);
      await analysePoll(pollId);
      await Promise.all([mutateAnalytics(), mutateStats()]);
      setAnalysisSuccess(true);
      showToast("Analysis complete", "success");
      setTimeout(() => setAnalysisSuccess(false), 1200);
    } catch {
      showToast("Analysis failed - check API key", "error");
    } finally {
      setAnalysing(false);
    }
  }

  async function handleGenerateStudentReport() {
    try {
      setLoadingStudentReport(true);
      const report = await fetchStudentReport(pollId);
      setStudentReport(report);
      showToast("Student report ready", "success");
    } catch {
      showToast("Student report unavailable - run Analyse first", "error");
    } finally {
      setLoadingStudentReport(false);
    }
  }

  async function handleGenerateInstitutionalReport() {
    try {
      setLoadingInstitutionalReport(true);
      const report = await fetchInstitutionalReport(pollId);
      setInstitutionalReport(report);
      showToast("Institutional report ready", "success");
    } catch {
      showToast("Institutional report unavailable - run Analyse first", "error");
    } finally {
      setLoadingInstitutionalReport(false);
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

  const dashboards = [
    { id: "overview", label: "Overview" },
    { id: "demographics", label: "Demographics" },
    { id: "insights", label: "Insights" },
    { id: "impact", label: "Impact" },
    { id: "reports", label: "Reports" },
    { id: "settings", label: "Settings" },
  ];

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
            {dashboards.map((item) => (
              <button
                key={item.id}
                onClick={() => openSection(item.id)}
                className={`rounded-full px-4 py-2 text-sm ${section === item.id ? "bg-black text-white" : "bg-white border border-zinc-200 text-zinc-700"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {section === "overview" ? (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Total responses</p>
                  <p className="mt-2 text-3xl font-light tracking-tight">{totalResponses}</p>
                </article>
                <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Top themes</p>
                  <p className="mt-2 text-3xl font-light tracking-tight">{themes.length}</p>
                </article>
                <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Sentiment summary</p>
                  <p className="mt-2 text-sm text-zinc-700">
                    +{sentimentDistribution.positive}% / ={sentimentDistribution.neutral}% / -{sentimentDistribution.negative}%
                  </p>
                </article>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-sm text-zinc-400">Top themes</p>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                    {(hasAnalysis ? themes : []).slice(0, 5).map((theme) => (
                      <li key={theme.id} className="flex items-center justify-between">
                        <span>{theme.label}</span>
                        <span className="text-zinc-500">{theme.percentage ?? 0}%</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-sm text-zinc-400">Trend indicator</p>
                  <p className="mt-2 text-lg font-medium">{trend?.response_delta ?? 0} response delta</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {trend?.compared_poll_id
                      ? `Compared with poll ${trend.compared_poll_id}. Theme shift: ${trend.top_theme_changed ? "yes" : "no"}.`
                      : "No prior poll to compare yet."}
                  </p>
                </article>
              </section>
            </>
          ) : null}

          {section === "demographics" ? (
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-100 bg-white p-6">
                <p className="text-sm text-zinc-400">Total participants</p>
                <p className="mt-2 text-4xl font-light tracking-tight">{stats?.response_count ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-6">
                <p className="text-sm text-zinc-400">Age band distribution</p>
                <div className="mt-3 space-y-2">
                  {Object.entries(analytics?.participation?.responses_per_age_band || {}).map(([band, count]) => (
                    <div key={band} className="flex items-center justify-between text-sm">
                      <span>{band}</span>
                      <span className="text-zinc-500">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-6 md:col-span-2">
                <p className="text-sm text-zinc-400">Group participation</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(responsesPerGroup).map(([group, count]) => (
                    <div key={group} className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                      {group}: <span className="text-zinc-500">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:col-span-2">
                <p className="text-sm font-medium text-amber-800">Missing groups warning</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-700">
                  {(underrepresentedGroups || []).length === 0 ? (
                    <li>No major underrepresentation detected from current baseline.</li>
                  ) : (
                    underrepresentedGroups.map((group) => (
                      <li key={group.group}>{group.group}: {group.gap}% below baseline.</li>
                    ))
                  )}
                </ul>
              </div>
            </section>
          ) : null}

          {section === "insights" ? (
            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-zinc-100 bg-white p-5 md:col-span-2">
                <p className="text-sm text-zinc-400">Key themes with explanations</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {themes.slice(0, 6).map((theme) => (
                    <div key={theme.id} className="rounded-xl border border-zinc-100 p-3">
                      <p className="font-medium text-zinc-900">{theme.label}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        Mentioned by {theme.response_count} responses ({theme.percentage ?? 0}%).
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">{theme.representative_quotes?.[0] || "No quote available."}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                <p className="text-sm text-zinc-400">Conflicting viewpoints</p>
                <div className="mt-3 space-y-3">
                  {conflicts.length === 0 ? (
                    <p className="text-sm text-zinc-500">No meaningful contradictions detected.</p>
                  ) : (
                    conflicts.slice(0, 4).map((conflict, idx) => (
                      <div key={`${conflict.topic}-${idx}`} className="rounded-xl bg-zinc-50 p-3 text-sm">
                        <p className="font-medium text-zinc-900">{conflict.topic}</p>
                        <p className="mt-1 text-zinc-600">A: {conflict.position_a}</p>
                        <p className="text-zinc-600">B: {conflict.position_b}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                <p className="text-sm text-zinc-400">Representative quotes</p>
                <div className="mt-3 space-y-3">
                  {themes.flatMap((theme) => (theme.representative_quotes || []).slice(0, 1).map((quote) => ({ theme: theme.label, quote }))).slice(0, 5).map((item, idx) => (
                    <blockquote key={`${item.theme}-${idx}`} className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
                      <p>"{item.quote}"</p>
                      <p className="mt-1 text-xs text-zinc-500">- {item.theme}</p>
                    </blockquote>
                  ))}
                </div>
              </article>
            </section>
          ) : null}

          {section === "impact" ? (
            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-zinc-100 bg-white p-5 md:col-span-2">
                <p className="text-sm text-zinc-400">Decision impact simulator</p>
                <div className="mt-3 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                  <p className="inline-flex items-center gap-2 font-medium text-zinc-900"><BarChart3 size={16} /> Impact summary</p>
                  <p className="mt-2">{impact?.summary || "Run analysis to generate impact simulation."}</p>
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                <p className="text-sm text-zinc-400">Affected groups</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                  {(impact?.affected_groups || []).length === 0 ? (
                    <li>No specific groups flagged yet.</li>
                  ) : (
                    (impact?.affected_groups || []).map((group) => <li key={group}>{group}</li>)
                  )}
                </ul>
              </article>

              <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                <p className="text-sm text-zinc-400">Trade-offs</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                  {(impact?.trade_offs || []).length === 0 ? (
                    <li>No major trade-offs identified yet.</li>
                  ) : (
                    (impact?.trade_offs || []).map((tradeoff, idx) => <li key={`${tradeoff}-${idx}`}>{tradeoff}</li>)
                  )}
                </ul>
              </article>
            </section>
          ) : null}

          {section === "reports" ? (
            <section className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="inline-flex items-center gap-2 text-sm text-zinc-400"><FileText size={15} /> Student report</p>
                  <p className="mt-2 text-sm text-zinc-600">Simple and transparent summary for student-facing communication.</p>
                  <button
                    onClick={handleGenerateStudentReport}
                    disabled={loadingStudentReport}
                    className="mt-3 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm"
                  >
                    {loadingStudentReport ? "Generating..." : "Generate Student Report"}
                  </button>
                </article>

                <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="inline-flex items-center gap-2 text-sm text-zinc-400"><FileText size={15} /> Institutional report</p>
                  <p className="mt-2 text-sm text-zinc-600">Structured report for decision-oriented institutional review.</p>
                  <button
                    onClick={handleGenerateInstitutionalReport}
                    disabled={loadingInstitutionalReport}
                    className="mt-3 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm"
                  >
                    {loadingInstitutionalReport ? "Generating..." : "Generate Institutional Report"}
                  </button>
                </article>
              </div>

              {studentReport ? (
                <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <h3 className="text-lg font-medium">Student Report</h3>
                  <p className="mt-2 text-sm text-zinc-700">{studentReport.what_students_said}</p>
                  <div className="mt-3 space-y-2">
                    {studentReport.top_themes.map((item) => (
                      <div key={item.theme} className="rounded-xl bg-zinc-50 p-3 text-sm">
                        <p className="font-medium">{item.theme}</p>
                        <p className="text-zinc-600">{item.key_insight}</p>
                        <p className="mt-1 text-zinc-500">"{item.quote}"</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-zinc-700">{studentReport.sentiment_summary}</p>
                  <p className="mt-1 text-xs text-zinc-500">{studentReport.transparency_note}</p>
                </article>
              ) : null}

              {institutionalReport ? (
                <article className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <h3 className="text-lg font-medium">Institutional Report</h3>
                  <p className="mt-2 text-sm text-zinc-700">{institutionalReport.executive_summary}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                    {institutionalReport.suggested_considerations.map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
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
