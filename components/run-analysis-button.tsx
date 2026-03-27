"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "./run-analysis-button.module.css";

type RunAnalysisButtonProps = {
  readonly consultationId: string;
  readonly label?: string;
  readonly redirectTo?: string;
  readonly variant?: "primary" | "secondary";
};

export function RunAnalysisButton({
  consultationId,
  label = "Run Analysis",
  redirectTo,
  variant = "primary",
}: RunAnalysisButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  const handleClick = (): void => {
    startTransition(async () => {
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/consultations/${consultationId}/analyse`,
          {
            method: "POST",
          },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;

          setErrorMessage(payload?.error ?? "Unable to run analysis.");
          return;
        }

        if (redirectTo) {
          globalThis.location.assign(redirectTo);
          return;
        }

        router.refresh();
      } catch {
        setErrorMessage("Unable to run analysis right now.");
      }
    });
  };

  return (
    <div>
      <button
        className={`${styles.button} ${variant === "secondary" ? styles.secondary : styles.primary}`}
        disabled={isPending}
        onClick={handleClick}
        type="button"
      >
        {isPending ? "Running..." : label}
      </button>
      {errorMessage ? (
        <p aria-live="polite" className={styles.error}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
