"use client";

import { FormEvent, useMemo, useState } from "react";

import { createPoll, PollCreatePayload } from "@/lib/api";
import { useToast } from "@/lib/toast";

type CreatePollModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (pollId: string) => void;
};

type Step = 1 | 2 | 3;

export function CreatePollModal({ isOpen, onClose, onCreated }: CreatePollModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"standard" | "under16">("standard");
  const [under16Consent, setUnder16Consent] = useState(false);

  const [age1617, setAge1617] = useState("");
  const [age1821, setAge1821] = useState("");
  const [age22plus, setAge22plus] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdPollId, setCreatedPollId] = useState("");
  const [qrBase64, setQrBase64] = useState("");
  const [pollUrl, setPollUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const baselineTotal = useMemo(() => {
    const a = Number(age1617 || 0);
    const b = Number(age1821 || 0);
    const c = Number(age22plus || 0);
    return a + b + c;
  }, [age1617, age1821, age22plus]);

  const baselineFilled = age1617 !== "" || age1821 !== "" || age22plus !== "";
  const baselineValid = !baselineFilled || baselineTotal === 100;
  const step1Valid =
    title.trim().length >= 3 &&
    organisation.trim().length >= 2 &&
    question.trim().length >= 5 &&
    (mode === "standard" || under16Consent);

  if (!isOpen) {
    return null;
  }

  function resetAndClose() {
    setStep(1);
    setError("");
    setSubmitting(false);
    onClose();
  }

  async function handleCreate(skipBaseline: boolean) {
    if (!step1Valid) return;
    if (!skipBaseline && !baselineValid) return;

    setSubmitting(true);
    setError("");

    try {
      const demographics: Record<string, number> = skipBaseline
        ? {}
        : {
            "16-17": Number(age1617 || 0),
            "18-21": Number(age1821 || 0),
            "22+": Number(age22plus || 0),
          };

      const payload: PollCreatePayload = {
        title: title.trim(),
        organisation: organisation.trim(),
        question: question.trim(),
        mode,
        institution_demographics: demographics,
        under16_consent_confirmed: mode === "under16" ? under16Consent : false,
        is_active: true,
      };

      const result = await createPoll(payload);
      const newPollId = result.poll.id;
      const frontendBase =
        (typeof window !== "undefined" && window.location.origin) || "http://localhost:3000";

      setCreatedPollId(newPollId);
      setQrBase64(result.qr_code_base64);
      setPollUrl(`${frontendBase}/poll/${newPollId}`);
      setStep(3);
      onCreated?.(newPollId);
      showToast("Poll created", "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create poll.";
      setError(message);
      showToast("Could not create poll", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(pollUrl);
      setCopied(true);
      showToast("Poll URL copied", "success");
    } catch {
      setCopied(false);
      showToast("Could not copy URL", "error");
    }
  }

  function downloadQr() {
    if (!qrBase64 || !createdPollId) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${qrBase64}`;
    link.download = `voxify-poll-${createdPollId}-qr.png`;
    link.click();
  }

  function onStep1Submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!step1Valid) return;
    setStep(2);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-100 bg-white p-8 shadow-none">
        {step === 1 ? (
          <form className="space-y-4" onSubmit={onStep1Submit}>
            <h2 className="text-2xl font-light tracking-tight">Create New Poll</h2>

            <div>
              <label className="mb-1 block text-sm text-zinc-500">Poll title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-3"
                placeholder="Monthly student consultation"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-500">Organisation name</label>
              <input
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-3"
                placeholder="Voxify Academy"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-500">Question</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-24 w-full rounded-xl border border-zinc-200 p-3"
                placeholder="What should we improve first this term?"
              />
            </div>

            <div>
              <p className="mb-2 text-sm text-zinc-500">Mode</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("standard")}
                  className={`rounded-full px-4 py-2 text-sm ${
                    mode === "standard" ? "bg-black text-white" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setMode("under16")}
                  className={`rounded-full px-4 py-2 text-sm ${
                    mode === "under16" ? "bg-black text-white" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  Under 16
                </button>
              </div>
            </div>

            {mode === "under16" ? (
              <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={under16Consent}
                  onChange={(e) => setUnder16Consent(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I confirm that institutional or parental consent has been obtained for all participants.
                  I understand this is my responsibility as organiser.
                </span>
              </label>
            ) : null}

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={resetAndClose} className="rounded-full px-5 py-2 text-sm text-zinc-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!step1Valid}
                className="rounded-full bg-black px-6 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-light tracking-tight">Help Missing Voices work better</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Enter your institution&apos;s actual demographic split. Skip this and the engine will still
                work - but without a baseline, it can&apos;t detect true underrepresentation.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-sm text-zinc-600">
                16-17 %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={age1617}
                  onChange={(e) => setAge1617(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 p-3"
                />
              </label>
              <label className="text-sm text-zinc-600">
                18-21 %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={age1821}
                  onChange={(e) => setAge1821(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 p-3"
                />
              </label>
              <label className="text-sm text-zinc-600">
                22+ %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={age22plus}
                  onChange={(e) => setAge22plus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 p-3"
                />
              </label>
            </div>

            <p className={`text-sm ${baselineValid ? "text-zinc-500" : "text-red-500"}`}>
              Total: {baselineTotal}%
            </p>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleCreate(true)}
                disabled={submitting}
                className="text-sm text-zinc-500 underline underline-offset-4"
              >
                Skip for now
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-full px-5 py-2 text-sm text-zinc-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleCreate(false)}
                  disabled={!baselineValid || submitting}
                  className="rounded-full bg-black px-6 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Poll"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h3 className="text-2xl font-light tracking-tight">Poll Created</h3>

            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${qrBase64}`}
                alt="Poll QR"
                className="h-52 w-52 rounded-xl border border-zinc-100"
              />
            </div>

            <div>
              <p className="mb-1 text-sm text-zinc-500">Poll URL</p>
              <div className="flex gap-2">
                <input readOnly value={pollUrl} className="w-full rounded-xl border border-zinc-200 p-3 text-sm" />
                <button onClick={copyUrl} className="rounded-full border border-zinc-200 px-4 text-sm">
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={downloadQr}
                className="rounded-full border border-zinc-200 px-6 py-2 text-sm text-zinc-700"
              >
                Download QR
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-full bg-black px-6 py-2 text-sm text-white"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
