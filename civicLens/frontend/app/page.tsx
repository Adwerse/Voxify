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

  function onLookupSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pollId = parsePollId(lookup);
    if (!pollId) return;
    router.push(`/poll/${pollId}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-xs font-bold text-white">CL</div>
            <p className="text-sm font-medium">Voxify</p>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-400 transition-colors hover:text-black">
            Council sign in -&gt;
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6">
        <section className="mx-auto max-w-2xl pb-16 pt-20 text-center">
          <span className="mb-6 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs uppercase tracking-widest text-zinc-500">
            Voxify
          </span>
          <h1 className="text-4xl font-light tracking-tight leading-tight sm:text-5xl">
            Student voices.
            <br />
            Actually heard.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg font-light text-zinc-400">
            Collect feedback via QR code. Analyse it with AI. Show students what changed because of what they said.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Card className="animate-[slide-up_0.2s_ease-out] rounded-2xl border border-zinc-200 p-6 text-left">
              <MessageSquare size={20} className="text-zinc-400" />
              <h2 className="mt-4 text-base font-medium">Respond to a poll</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Scan a QR code or enter the link shared by your school or council.
              </p>
              <form className="mt-4 space-y-3" onSubmit={onLookupSubmit}>
                <input
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  placeholder="Enter poll code or URL"
                  className="w-full rounded-xl border border-zinc-200 p-3 text-sm"
                />
                <button className="w-full rounded-full bg-black px-5 py-2 text-sm text-white">Go -&gt;</button>
              </form>
            </Card>

            <Card dark className="animate-[slide-up_0.2s_ease-out] rounded-2xl bg-zinc-950 p-6 text-left">
              <BarChart2 size={20} className="text-zinc-400" />
              <h2 className="mt-4 text-base font-medium text-white">Run a consultation</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Create polls, collect responses, and get AI-powered reports for your council.
              </p>
              <div className="mt-4 space-y-2">
                <Link
                  href="/dashboard"
                  className="block w-full rounded-full bg-white px-5 py-2 text-center text-sm text-black"
                >
                  Open dashboard -&gt;
                </Link>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="w-full rounded-full border border-zinc-700 px-5 py-2 text-sm text-white"
                >
                  Create new poll
                </button>
              </div>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Your Polls</h2>
          <p className="mt-1 text-sm text-zinc-400">Recent consultations</p>
          <div className="mt-4">
            {loading ? <div className="h-24 animate-pulse rounded-2xl bg-zinc-100" /> : null}
            {!loading && rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
                <p className="text-sm text-zinc-500">No polls yet - create one to get started</p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4 rounded-full bg-black px-5 py-2 text-sm text-white"
                >
                  New poll
                </button>
              </div>
            ) : null}
            {rows.map(({ poll, responses, active }) => (
              <div key={poll.id} className="flex flex-wrap items-center gap-4 border-b border-zinc-100 py-5">
                <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-zinc-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{poll.title}</p>
                  <p className="max-w-md truncate text-xs text-zinc-400">{poll.question}</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    {responses} responses · Created {relativeDate(poll.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQrPoll(poll)}
                    className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs hover:bg-zinc-50"
                  >
                    Poll ↗
                  </button>
                  <Link href={`/results/${poll.id}`} className="rounded-full bg-zinc-950 px-4 py-1.5 text-xs text-white">
                    Results
                  </Link>
                  <Link href={`/dashboard?pollId=${poll.id}`} className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs">
                    Dashboard
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h3 className="mb-10 text-center text-sm uppercase tracking-widest text-zinc-400">How it works</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Share a QR code",
                body: "Students scan - no app, no login, no friction.",
                Icon: QrCode,
              },
              {
                title: "AI reads the responses",
                body: "Themes, sentiment, and who isn't being heard - surfaced automatically.",
                Icon: Sparkles,
              },
              {
                title: "Close the loop",
                body: "Students get a follow-up token to check what changed because of what they said.",
                Icon: CheckCircle,
              },
            ].map(({ title, body, Icon }, idx) => (
              <Card key={title} className="rounded-2xl border border-zinc-100 p-6">
                <span className="mb-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-500">
                  {idx + 1}
                </span>
                <Icon size={20} className="text-zinc-400" />
                <p className="mt-3 text-sm font-medium">{title}</p>
                <p className="mt-2 text-sm text-zinc-400">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-zinc-100 py-8 text-center text-xs text-zinc-300">
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
