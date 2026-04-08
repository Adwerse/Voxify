"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, CheckCircle, MessageSquare, QrCode, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import useSWR from "swr";

import { CreatePollModal } from "@/components/dashboard/CreatePollModal";
import { fetchPolls, fetchResponseStats, Poll } from "@/lib/api";
import { Card } from "@/components/ui/card";

function parsePollId(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    const parts = value.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }
  return value;
}

function relativeDate(iso: string): string {
  const created = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.max(0, Math.floor(diffMs / dayMs));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function HomePage() {
  const router = useRouter();
  const [lookup, setLookup] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrPoll, setQrPoll] = useState<Poll | null>(null);
  const { data: polls = [], isLoading: loading } = useSWR("polls", fetchPolls);

  const { data: statsMap } = useSWR(
    polls.length ? ["poll-stats", ...polls.map((poll) => poll.id)] : null,
    async () => {
      const entries = await Promise.all(
        polls.map(async (poll) => {
          let stats = { response_count: 0, age_band_distribution: {}, last_response_at: null as string | null };
          try {
            const loaded = await fetchResponseStats(poll.id);
            stats = {
              response_count: loaded.response_count,
              age_band_distribution: loaded.age_band_distribution,
              last_response_at: loaded.last_response_at ?? null,
            };
          } catch {
            // Keep list usable even if one poll stats request fails.
          }
          return [poll.id, stats] as const;
        })
      );
      return Object.fromEntries(entries);
    }
  );

  const rows = useMemo(() => {
    return polls.map((poll) => {
      const stats = statsMap?.[poll.id];
      const responses = stats?.response_count ?? 0;
      const lastResponseAt = stats?.last_response_at ? new Date(stats.last_response_at) : null;
      const active = !!lastResponseAt && Date.now() - lastResponseAt.getTime() <= 7 * 24 * 60 * 60 * 1000;
      return { poll, responses, active };
    });
  }, [polls, statsMap]);

  const totalResponses = useMemo(
    () => rows.reduce((sum, row) => sum + row.responses, 0),
    [rows]
  );

  const activePollsCount = useMemo(
    () => rows.filter((row) => row.active).length,
    [rows]
  );

  function onLookupSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pollId = parsePollId(lookup);
    if (!pollId) return;
    router.push(`/poll/${pollId}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="relative sticky top-0 z-30 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="live-gradient-top pointer-events-none absolute inset-x-0 top-0 h-1" />
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-xs font-bold text-white">CL</div>
            <div>
              <p className="text-sm font-medium leading-none">Voxify</p>
              <p className="text-xs text-zinc-400">Civic feedback platform</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
          >
            Council sign in -&gt;
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white px-5 py-8 sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-zinc-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-zinc-100/50 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live civic signal
              </span>

              <h1 className="mt-5 text-4xl font-light leading-tight tracking-tight text-zinc-900 sm:text-5xl">
                Student voices.
                <br />
                Measurable action.
              </h1>

              <p className="mt-4 max-w-xl text-base text-zinc-500 sm:text-lg">
                Run fast consultations, surface trustworthy insights, and close the loop with students through transparent outcomes.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Active polls</p>
                  <p className="mt-1 text-2xl font-light text-zinc-900">{activePollsCount}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Total responses</p>
                  <p className="mt-1 text-2xl font-light text-zinc-900">{totalResponses}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Turnaround</p>
                  <p className="mt-1 text-2xl font-light text-zinc-900">~90s</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-[0_8px_26px_rgba(15,23,42,0.05)]">
                <MessageSquare size={18} className="text-zinc-500" />
                <h2 className="mt-4 text-base font-medium text-zinc-900">Respond to a poll</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Paste a poll link or code from your class, union, or council.
                </p>
                <form className="mt-4 space-y-3" onSubmit={onLookupSubmit}>
                  <input
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    placeholder="Enter poll code or URL"
                    className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none transition focus:border-zinc-400"
                  />
                  <button className="w-full rounded-full bg-zinc-900 px-5 py-2.5 text-sm text-white transition hover:bg-black">
                    Join poll -&gt;
                  </button>
                </form>
              </Card>

              <Card dark className="consultation-card-glow rounded-2xl bg-zinc-950 p-6 text-left shadow-[0_10px_28px_rgba(2,6,23,0.36)]">
                <BarChart2 size={18} className="text-zinc-400" />
                <h2 className="mt-4 text-base font-medium text-white">Run a consultation</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Build polls, gather verified voices, and generate actionable reports for decision-makers.
                </p>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/dashboard"
                    className="block w-full rounded-full bg-white px-5 py-2.5 text-center text-sm text-black transition hover:bg-zinc-100"
                  >
                    Open dashboard -&gt;
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="w-full rounded-full border border-zinc-700 px-5 py-2.5 text-sm text-white transition hover:border-zinc-500"
                  >
                    Create new poll
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-medium text-zinc-900">Recent consultations</h2>
              <p className="mt-1 text-sm text-zinc-500">Track momentum and open results in one place.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
            >
              New poll
            </button>
          </div>

          <div className="space-y-3">
            {loading ? <div className="h-24 skeleton-shimmer rounded-2xl" /> : null}
            {!loading && rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
                <p className="text-sm text-zinc-500">No polls yet. Launch your first consultation to get started.</p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-sm text-white"
                >
                  Create first poll
                </button>
              </div>
            ) : null}

            {rows.map(({ poll, responses, active }) => (
              <article
                key={poll.id}
                className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.03)] transition hover:border-zinc-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-zinc-300"}`} />
                      <p className="text-sm font-medium text-zinc-900">{poll.title}</p>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-500">{poll.question}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">
                      {responses} responses · created {relativeDate(poll.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setQrPoll(poll)}
                      className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Poll ↗
                    </button>
                    <Link
                      href={`/results/${poll.id}`}
                      className="results-shimmer rounded-full bg-zinc-950 px-4 py-1.5 text-xs text-white"
                    >
                      Results
                    </Link>
                    <Link
                      href={`/dashboard?pollId=${poll.id}`}
                      className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Dashboard
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-zinc-200 bg-zinc-50/60 px-5 py-8 sm:px-8">
          <h3 className="text-center text-sm uppercase tracking-[0.18em] text-zinc-500">How Voxify Works</h3>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Share a QR code",
                body: "Students join in seconds with no account setup and no app install.",
                Icon: QrCode,
              },
              {
                title: "Surface real signals",
                body: "AI clusters themes, highlights sentiment, and flags who might be missing.",
                Icon: Sparkles,
              },
              {
                title: "Close the loop",
                body: "Publish outcomes and show students exactly what changed from their input.",
                Icon: CheckCircle,
              },
            ].map(({ title, body, Icon }, idx) => (
              <Card key={title} className="rounded-2xl border border-zinc-200 bg-white p-6">
                <span className="mb-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-500">
                  {idx + 1}
                </span>
                <Icon size={20} className="text-zinc-500" />
                <p className="mt-3 text-sm font-medium text-zinc-900">{title}</p>
                <p className="mt-2 text-sm text-zinc-500">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        <footer className="mt-14 border-t border-zinc-100 py-8 text-center text-xs tracking-wide text-zinc-400">
          Voxify · Student voice infrastructure
        </footer>
      </main>

      <CreatePollModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      {qrPoll ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="text-lg font-medium">Poll QR</h3>
            <p className="mt-1 text-sm text-zinc-400">Share this code with students.</p>
            <div className="mt-4 flex justify-center rounded-2xl border border-zinc-100 p-5">
              <QRCodeSVG value={`${window.location.origin}/poll/${qrPoll.id}`} size={180} />
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/poll/${qrPoll.id}`}
                className="flex-1 rounded-full border border-zinc-200 px-4 py-2 text-center text-sm"
              >
                Open poll
              </Link>
              <button
                type="button"
                onClick={() => setQrPoll(null)}
                className="flex-1 rounded-full bg-black px-4 py-2 text-sm text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
