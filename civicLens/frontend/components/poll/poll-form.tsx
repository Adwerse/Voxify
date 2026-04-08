"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Clock3, Copy, KeyRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ApiError, fetchAuthMe, fetchPoll, Poll, registerAnonymousIdentity, submitResponse } from "@/lib/api";
import { useToast } from "@/lib/toast";

type PollFormProps = {
  pollId: string;
};

type ScreenState = "identity" | "consent" | "form" | "thankyou";
type IdentitySession = {
  emojiId: string;
  token: string;
  verified: boolean;
  cohort: string;
};

const MAX_LENGTH = 500;
const AGE_BANDS = ["16-17", "18-21", "22-25", "25+"] as const;
const TOKEN_STORAGE_KEY = "voxify.auth.token";
const EMOJI_STORAGE_KEY = "voxify.auth.emoji_id";
const COHORT_STORAGE_KEY = "voxify.auth.cohort";

export function PollForm({ pollId }: PollFormProps) {
  const { showToast } = useToast();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [screen, setScreen] = useState<ScreenState>("identity");
  const [identitySession, setIdentitySession] = useState<IdentitySession | null>(null);
  const [hydratingIdentity, setHydratingIdentity] = useState(true);
  const [justRegisteredEmoji, setJustRegisteredEmoji] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [cohortYear, setCohortYear] = useState("");
  const [demographicBand, setDemographicBand] = useState("");

  const [responseText, setResponseText] = useState("");
  const [ageBand, setAgeBand] = useState<(typeof AGE_BANDS)[number] | undefined>(undefined);
  const [groupTag, setGroupTag] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [token, setToken] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [loadingPoll, setLoadingPoll] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoadingPoll(true);
    setError("");

    fetchPoll(pollId)
      .then((data) => {
        if (!mounted) return;
        setPoll(data);
      })
      .catch(() => {
        if (!mounted) return;
        setError("We could not load this poll right now. Please try again.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingPoll(false);
      });

    return () => {
      mounted = false;
    };
  }, [pollId]);

  useEffect(() => {
    let mounted = true;

    async function hydrateIdentity() {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
      const storedEmoji = localStorage.getItem(EMOJI_STORAGE_KEY) || "";
      const storedCohort = localStorage.getItem(COHORT_STORAGE_KEY) || "Unspecified";

      if (!storedToken || !storedEmoji) {
        if (mounted) {
          setScreen("identity");
          setHydratingIdentity(false);
        }
        return;
      }

      try {
        const me = await fetchAuthMe(storedToken);
        if (!mounted) return;

        setIdentitySession({
          emojiId: me.emoji_id,
          token: storedToken,
          verified: me.verified,
          cohort: me.cohort || storedCohort,
        });
        setScreen("consent");
      } catch (err) {
        const isAuthIssue = err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 404);
        if (!isAuthIssue && mounted) {
          showToast("Could not validate saved session", "error");
        }

        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(EMOJI_STORAGE_KEY);
        localStorage.removeItem(COHORT_STORAGE_KEY);
        if (!mounted) return;
        setScreen("identity");
      } finally {
        if (mounted) {
          setHydratingIdentity(false);
        }
      }
    }

    hydrateIdentity();

    return () => {
      mounted = false;
    };
  }, []);

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !studentId.trim()) {
      setAuthError("Name, email, and student ID are required.");
      return;
    }

    setRegistering(true);
    setAuthError("");

    try {
      const registration = await registerAnonymousIdentity({
        name: fullName.trim(),
        email: email.trim(),
        student_id: studentId.trim(),
        cohort_year: cohortYear.trim() || undefined,
        demographic_band: demographicBand.trim() || undefined,
      });

      const me = await fetchAuthMe(registration.token).catch(() => ({
        emoji_id: registration.emoji_id,
        verified: registration.verified,
        cohort: cohortYear.trim() || "Unspecified",
      }));

      localStorage.setItem(TOKEN_STORAGE_KEY, registration.token);
      localStorage.setItem(EMOJI_STORAGE_KEY, registration.emoji_id);
      localStorage.setItem(COHORT_STORAGE_KEY, me.cohort || "Unspecified");

      setIdentitySession({
        emojiId: me.emoji_id,
        token: registration.token,
        verified: me.verified,
        cohort: me.cohort || "Unspecified",
      });
      setJustRegisteredEmoji(me.emoji_id);
      setScreen("consent");
      showToast(`You are now ${me.emoji_id} - verified`, "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Verification failed. Please try again.";
      setAuthError(message);
      showToast(message, "error");
    } finally {
      setRegistering(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!poll || !responseText.trim()) return;

    const sessionToken = identitySession?.token || localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    if (!sessionToken) {
      setScreen("identity");
      setError("Please verify your anonymous identity before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await submitResponse(poll.id, {
        response_text: responseText.trim(),
        age_band: ageBand,
        group_tag: groupTag.trim() ? groupTag.trim() : undefined,
      }, sessionToken);
      setToken(result.follow_up_token);
      setScreen("thankyou");
      showToast("Response submitted", "success");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(EMOJI_STORAGE_KEY);
        localStorage.removeItem(COHORT_STORAGE_KEY);
        setIdentitySession(null);
        setScreen("identity");
        setError("Your session expired. Re-verify your anonymous identity to submit.");
        showToast(err.detail || "Session expired. Please verify again.", "error");
      } else {
        const message = err instanceof ApiError ? err.detail : "Could not submit your response. Please try again.";
        setError(message);
        showToast(message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyToken() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopyState("copied");
      showToast("Token copied", "success");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      showToast("Could not copy token", "error");
    }
  }

  const charsUsed = useMemo(() => responseText.length, [responseText]);
  const counterColor = charsUsed >= 490 ? "text-red-500" : charsUsed >= 450 ? "text-amber-500" : "text-zinc-300";

  if (loadingPoll || hydratingIdentity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Preparing secure session...</p>
        </div>
      </div>
    );
  }

  if (!poll) {
    throw new Error(error || "Poll unavailable");
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-sm">
        {screen === "identity" ? (
          <section className="pt-10 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-black text-xs font-bold text-white">CL</div>
            <p className="mt-2 text-sm text-zinc-400">Voxify anonymous identity</p>
            <h1 className="mt-5 text-2xl font-light tracking-tight">Verify once, stay anonymous</h1>

            <Card className="mt-6 rounded-2xl bg-zinc-50 p-5 text-left text-sm">
              <p className="mb-2 font-medium">How this works</p>
              <ul className="space-y-2 text-zinc-600">
                <li className="flex items-start gap-2">
                  <Check size={14} className="mt-0.5 text-zinc-400" />
                  <span>Your real details are used only for verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="mt-0.5 text-zinc-400" />
                  <span>You post publicly as an emoji identity, not your name</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="mt-0.5 text-zinc-400" />
                  <span>Councillors only see verified emoji IDs and demographic band</span>
                </li>
              </ul>
            </Card>

            <form onSubmit={onRegister} className="mt-6 space-y-3 text-left">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Student email"
                type="email"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm"
              />
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                placeholder="Student ID (e.g. TUS12345678)"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm uppercase"
              />
              <input
                value={cohortYear}
                onChange={(e) => setCohortYear(e.target.value)}
                placeholder="Cohort/year (optional)"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm"
              />
              <input
                value={demographicBand}
                onChange={(e) => setDemographicBand(e.target.value)}
                placeholder="Demographic band (optional)"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm"
              />

              {authError ? <p className="text-sm text-red-500">{authError}</p> : null}

              <button
                type="submit"
                disabled={registering}
                className="w-full rounded-full bg-black py-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {registering ? "Verifying..." : "Create my anonymous identity -&gt;"}
              </button>
            </form>
          </section>
        ) : null}

        {screen === "consent" ? (
          <section className="pt-16 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-black text-xs font-bold text-white">CL</div>
            <p className="mt-2 text-sm text-zinc-400">{poll.organisation}</p>
            <h1 className="mt-6 text-2xl font-light tracking-tight">{poll.title}</h1>

            {identitySession ? (
              <Card dark className="mt-4 rounded-2xl p-4 text-left">
                <p className="text-xs uppercase tracking-widest text-zinc-400">Your anonymous identity</p>
                <p className="mt-2 text-2xl font-medium text-white">{identitySession.emojiId}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {identitySession.verified ? "Verified" : "Unverified"} · Cohort {identitySession.cohort}
                </p>
                {justRegisteredEmoji ? (
                  <p className="mt-3 text-sm text-emerald-300">You are now {justRegisteredEmoji} - verified ✓</p>
                ) : null}
              </Card>
            ) : null}

            <Card className="mt-6 rounded-2xl bg-zinc-50 p-5 text-left text-sm">
              <p className="mb-3 font-medium">Before you respond</p>
              <ul className="space-y-2 text-zinc-600">
                <li className="flex items-start gap-2">
                  <Check size={14} className="mt-0.5 text-zinc-400" />
                  <span>Your response is stored under your emoji identity, never your real name</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="mt-0.5 text-zinc-400" />
                  <span>Councillors only see verified status and demographic band</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="mt-0.5 text-zinc-400" />
                  <span>You&apos;ll receive a one-time token to check outcomes later</span>
                </li>
              </ul>
              <p className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                <Clock3 size={14} className="text-zinc-300" /> Takes under 90 seconds
              </p>
            </Card>
            <button
              type="button"
              onClick={() => setScreen("form")}
              className="mt-6 w-full rounded-full bg-black py-4 text-sm font-medium text-white"
            >
              I understand, start -&gt;
            </button>
          </section>
        ) : null}

        {screen === "form" ? (
          <section className="pt-8">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Step 3 of 3</span>
              <span className="h-2 w-2 rounded-full bg-black" />
              <span className="h-2 w-2 rounded-full bg-zinc-200" />
            </div>
            <h2 className="mt-4 text-xl font-light leading-snug">{poll.question}</h2>
            {identitySession ? <p className="mt-2 text-sm text-zinc-400">Posting as {identitySession.emojiId}</p> : null}

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <textarea
                  value={responseText}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setResponseText(e.target.value.slice(0, MAX_LENGTH))
                  }
                  placeholder="Share your thoughts..."
                  maxLength={MAX_LENGTH}
                  className="mt-6 min-h-[120px] w-full rounded-2xl border border-zinc-200 p-4 text-sm outline-none ring-0 focus:border-zinc-400"
                />
                <p className={`mt-1 text-right text-xs ${counterColor}`}>
                  {charsUsed}/{MAX_LENGTH}
                </p>
              </div>

              <Card className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-center text-xs text-zinc-300">
                  ---- Optional: help us understand who isn&apos;t heard ----
                </p>
                <button
                  type="button"
                  onClick={() => setShowOptional((prev: boolean) => !prev)}
                  className="mt-2 flex w-full items-center justify-center text-left"
                >
                  <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${showOptional ? "rotate-180" : ""}`} />
                </button>

                {showOptional ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-2 text-xs text-zinc-500">Your age group</p>
                      <div className="flex w-full overflow-hidden rounded-xl">
                        {AGE_BANDS.map((band) => {
                          const selected = ageBand === band;
                          return (
                            <button
                              key={band}
                              type="button"
                              onClick={() => setAgeBand(selected ? undefined : band)}
                              className={`flex-1 border-y border-r border-zinc-200 px-2 py-2 text-center text-xs first:rounded-l-xl first:border-l last:rounded-r-xl ${
                                selected ? "border-zinc-950 bg-zinc-950 text-white" : "bg-white text-zinc-700"
                              }`}
                            >
                              {band}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-zinc-400">Group tag</label>
                      <input
                        type="text"
                        value={groupTag}
                        onChange={(e) => setGroupTag(e.target.value.slice(0, 40))}
                        placeholder="e.g. commuter, part-time, Arts Society"
                        className="w-full rounded-xl border border-zinc-200 p-3 text-xs outline-none focus:border-zinc-300"
                      />
                      <p className="mt-1 text-xs text-zinc-300">Helps surface which groups aren&apos;t being heard</p>
                    </div>
                  </div>
                ) : null}
              </Card>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting || responseText.trim().length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-black py-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent bg-white" />
                ) : null}
                {submitting ? "Submitting..." : "Submit my response -&gt;"}
              </button>
            </form>
          </section>
        ) : null}

        {screen === "thankyou" ? (
          <section className="pt-16 text-center">
            <div className="mx-auto flex h-16 w-16 animate-[scale-in_0.3s_ease-out] items-center justify-center rounded-full bg-black">
              <Check className="h-7 w-7 text-white" strokeWidth={2} />
            </div>
            <h2 className="mt-6 text-2xl font-light tracking-tight">Response submitted</h2>
            <p className="mt-2 text-sm text-zinc-400">Thank you for making your voice count.</p>
            {identitySession ? <p className="mt-1 text-sm text-zinc-500">Submitted as {identitySession.emojiId}</p> : null}

            <Card dark className="mt-6 rounded-2xl p-6 text-left">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400">
                <KeyRound size={14} />
                <span>Your follow-up token</span>
              </div>
              <p className="mt-3 font-mono text-2xl tracking-[0.2em] text-white">{token}</p>
              <p className="mt-4 text-xs leading-relaxed text-zinc-400">
                Save this code. When a decision is made about this consultation, enter your token at the
                results page to see what happened because of your input. It will not be shown again.
              </p>
              <button
                type="button"
                onClick={handleCopyToken}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 px-5 py-2 text-sm text-white"
              >
                <Copy size={14} />
                {copyState === "copied" ? "Copied!" : "Copy token"}
              </button>
            </Card>

            <div className="mt-6">
              <Link href={`/results/${poll.id}`} className="text-sm text-zinc-700 underline underline-offset-4">
                See what others said -&gt;
              </Link>
              <div className="mt-3">
                <Link href="/" className="text-xs text-zinc-300">
                  Back to home
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
