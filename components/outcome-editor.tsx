"use client";

import Link from "next/link";
import { useState } from "react";

import type { Outcome } from "@/types";

import styles from "./outcome-editor.module.css";

type OutcomeEditorProps = {
  readonly consultationId: string;
  readonly initialOutcome: Outcome | null;
};

type ErrorPayload = {
  error?: string;
};

type OutcomeApiSuccess = {
  success: boolean;
  outcome: Outcome;
};

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ErrorPayload;
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
  } catch {
    return "Request failed. Please try again.";
  }

  return "Request failed. Please try again.";
}

export function OutcomeEditor({
  consultationId,
  initialOutcome,
}: OutcomeEditorProps) {
  const [decisionTitle, setDecisionTitle] = useState(
    initialOutcome?.decisionTitle ?? "",
  );
  const [decisionDescription, setDecisionDescription] = useState(
    initialOutcome?.decisionDescription ?? "",
  );
  const [influencedByInput, setInfluencedByInput] = useState(
    initialOutcome?.influencedByInput ?? true,
  );
  const [organiserExplanation, setOrganiserExplanation] = useState(
    initialOutcome?.organiserExplanation ?? "",
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedOutcome, setSavedOutcome] = useState<Outcome | null>(
    initialOutcome,
  );

  async function onSaveOutcome() {
    setErrorMessage(null);

    if (
      decisionTitle.trim().length === 0 ||
      decisionDescription.trim().length === 0 ||
      organiserExplanation.trim().length === 0
    ) {
      setErrorMessage("All fields are required.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/consultations/${consultationId}/outcome`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decisionTitle,
            decisionDescription,
            influencedByInput,
            organiserExplanation,
          }),
        },
      );

      if (!response.ok) {
        setErrorMessage(await extractErrorMessage(response));
        return;
      }

      const payload = (await response.json()) as OutcomeApiSuccess;
      setSavedOutcome(payload.outcome);
      setDecisionTitle(payload.outcome.decisionTitle);
      setDecisionDescription(payload.outcome.decisionDescription);
      setInfluencedByInput(payload.outcome.influencedByInput);
      setOrganiserExplanation(payload.outcome.organiserExplanation);
    } catch {
      setErrorMessage("Unable to save outcome right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>Outcome Editor</h2>
      <p className={styles.helpText}>
        Publish a clear decision summary to close the loop with students.
      </p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void onSaveOutcome();
        }}
      >
        <label className={styles.fieldLabel} htmlFor="decision-title">
          Decision title
        </label>
        <input
          className={styles.fieldInput}
          id="decision-title"
          maxLength={140}
          onChange={(event) => setDecisionTitle(event.target.value)}
          placeholder="Extend counselling hours"
          value={decisionTitle}
        />

        <label className={styles.fieldLabel} htmlFor="decision-description">
          Decision description
        </label>
        <textarea
          className={styles.fieldTextarea}
          id="decision-description"
          maxLength={600}
          onChange={(event) => setDecisionDescription(event.target.value)}
          placeholder="Evening sessions launched for an 8-week pilot."
          rows={4}
          value={decisionDescription}
        />

        <label className={styles.checkboxRow} htmlFor="influenced-by-input">
          <input
            checked={influencedByInput}
            id="influenced-by-input"
            onChange={(event) => setInfluencedByInput(event.target.checked)}
            type="checkbox"
          />
          <span>Student input influenced this decision</span>
        </label>

        <label className={styles.fieldLabel} htmlFor="organiser-explanation">
          {influencedByInput
            ? "Explain how student input influenced this decision"
            : "Explain why this decision did not use student input"}
        </label>
        <textarea
          className={styles.fieldTextarea}
          id="organiser-explanation"
          maxLength={1200}
          onChange={(event) => setOrganiserExplanation(event.target.value)}
          placeholder="Recurring student feedback highlighted access barriers during daytime slots."
          rows={6}
          value={organiserExplanation}
        />

        {errorMessage ? (
          <p className={styles.errorText}>{errorMessage}</p>
        ) : null}

        <button
          className={styles.primaryButton}
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving outcome…" : "Save Outcome"}
        </button>
      </form>

      {savedOutcome ? (
        <div className={styles.successCard}>
          <p className={styles.successTitle}>Outcome saved</p>
          <p className={styles.successText}>
            The public close-the-loop view is ready.
          </p>
          <Link
            className={styles.secondaryAction}
            href={`/consultation/${consultationId}/outcome`}
          >
            View public outcome page
          </Link>
        </div>
      ) : null}
    </section>
  );
}
