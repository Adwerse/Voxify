"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AgeBand } from "@/types";

import styles from "./consultation-response-form.module.css";

const ageBands: Array<{ value: AgeBand; label: string }> = [
  { value: "16-17", label: "16-17" },
  { value: "18-21", label: "18-21" },
  { value: "22-25", label: "22-25" },
  { value: "other", label: "Other" },
];

interface ConsultationResponseFormProps {
  readonly consultationId: string;
  readonly questionPrompts: string[];
}

export function ConsultationResponseForm({
  consultationId,
  questionPrompts,
}: ConsultationResponseFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("18-21");
  const [groupInput, setGroupInput] = useState("");
  const [answers, setAnswers] = useState<string[]>(
    questionPrompts.map(() => ""),
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedGroups = useMemo(
    () =>
      groupInput
        .split(",")
        .map((group) => group.trim())
        .filter((group) => group.length > 0),
    [groupInput],
  );

  const handleAnswerChange = (index: number, value: string): void => {
    setAnswers((previous) =>
      previous.map((answer, itemIndex) =>
        itemIndex === index ? value : answer,
      ),
    );
  };

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = (event) => {
    event.preventDefault();
    setErrorMessage("");

    const nonEmptyAnswers = answers
      .map((answer) => answer.trim())
      .filter((answer) => answer.length > 0);

    if (nonEmptyAnswers.length === 0) {
      setErrorMessage(
        "Please provide at least one response before submitting.",
      );
      return;
    }

    setIsSubmitting(true);

    const submitResponse = async (): Promise<void> => {
      try {
        const response = await fetch("/api/responses", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            consultationId,
            answers,
            meta: {
              nickname: nickname.trim() || undefined,
              ageBand,
              groups: parsedGroups,
            },
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;

          setErrorMessage(payload?.error ?? "Unable to submit response.");
          return;
        }

        router.push(`/consultation/${consultationId}/thanks`);
      } catch {
        setErrorMessage("Something went wrong while submitting your response.");
      } finally {
        setIsSubmitting(false);
      }
    };

    void submitResponse();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="nickname">
          Nickname (optional)
        </label>
        <input
          className={styles.input}
          id="nickname"
          maxLength={40}
          name="nickname"
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Optional"
          type="text"
          value={nickname}
        />
      </div>

      <div className={styles.grid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="ageBand">
            Age band
          </label>
          <select
            className={styles.input}
            id="ageBand"
            name="ageBand"
            onChange={(event) => setAgeBand(event.target.value as AgeBand)}
            value={ageBand}
          >
            {ageBands.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="groupInput">
            Self-described groups
          </label>
          <input
            className={styles.input}
            id="groupInput"
            name="groupInput"
            onChange={(event) => setGroupInput(event.target.value)}
            placeholder="Example: commuter, first-year"
            type="text"
            value={groupInput}
          />
          <p className={styles.helpText}>
            Separate multiple groups with commas.
          </p>
        </div>
      </div>

      {questionPrompts.map((question, index) => (
        <div className={styles.fieldGroup} key={`${question}-${index}`}>
          <label className={styles.label} htmlFor={`question-${index}`}>
            {question}
          </label>
          <textarea
            className={styles.textarea}
            id={`question-${index}`}
            name={`question-${index}`}
            onChange={(event) => handleAnswerChange(index, event.target.value)}
            required={index === 0}
            rows={4}
            value={answers[index] ?? ""}
          />
        </div>
      ))}

      {errorMessage ? (
        <p aria-live="polite" className={styles.errorText}>
          {errorMessage}
        </p>
      ) : null}

      <button
        className={styles.submitButton}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
