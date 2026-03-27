import { Fragment } from "react";
import Link from "next/link";

import { getConsultationAnalysis } from "@/lib/analysis-store";
import {
  getOutcome,
  listConsultations,
  listDecisions,
  listResponses,
} from "@/lib/store";
import { RunAnalysisButton } from "@/components/run-analysis-button";

import styles from "./page.module.css";

export default function OrganiserDashboardPage() {
  const consultations = listConsultations();
  const allDecisions = listDecisions();

  return (
    <main className={styles.page}>
      <section className={styles.headerCard}>
        <p className={styles.eyebrow}>Organiser Dashboard</p>
        <h1 className={styles.title}>Consultation Overview</h1>
        <p className={styles.description}>
          Demo mode is enabled. Authentication is intentionally skipped for this
          hackathon build.
        </p>
      </section>

      {consultations.length === 0 ? (
        <section className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>No consultations yet</h2>
          <p className={styles.emptyText}>
            Seed or create a consultation to start collecting responses.
          </p>
        </section>
      ) : (
        <section className={styles.listSection}>
          {consultations.map((consultation) => {
            const responseCount = listResponses(consultation.id).length;
            const proposalCount = allDecisions.length;
            const hasOutcome = Boolean(getOutcome(consultation.id));
            const hasAnalysis = Boolean(
              getConsultationAnalysis(consultation.id),
            );

            const pipeline = [
              { label: "Collect", done: responseCount > 0 },
              { label: "Analyse", done: hasAnalysis },
              { label: "Act", done: hasAnalysis && proposalCount > 0 },
              { label: "Close Loop", done: hasOutcome },
            ];

            return (
              <article
                className={styles.consultationCard}
                key={consultation.id}
              >
                <header className={styles.cardHeader}>
                  <div>
                    <h2 className={styles.consultationTitle}>
                      {consultation.title}
                    </h2>
                    <p className={styles.consultationDescription}>
                      {consultation.description}
                    </p>
                  </div>
                  <span
                    className={styles.statusTag}
                    data-status={consultation.status}
                  >
                    {consultation.status}
                  </span>
                </header>

                <div className={styles.pipelineRow}>
                  {pipeline.map((step, i) => (
                    <Fragment key={step.label}>
                      <div
                        className={`${styles.pipelineStep} ${step.done ? styles.stepDone : ""}`}
                      >
                        <span className={styles.stepDot}>
                          {step.done ? "✓" : i + 1}
                        </span>
                        <span className={styles.stepLabel}>{step.label}</span>
                      </div>
                      {i < pipeline.length - 1 && (
                        <div
                          className={`${styles.pipelineConnector} ${step.done ? styles.connectorDone : ""}`}
                        />
                      )}
                    </Fragment>
                  ))}
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Responses</span>
                    <span className={styles.statValue}>{responseCount}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Proposals</span>
                    <span className={styles.statValue}>{proposalCount}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Outcome</span>
                    <span className={styles.statValue}>
                      {hasOutcome ? "Published" : "Pending"}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Analysis</span>
                    <span className={styles.statValue}>
                      {hasAnalysis ? "Available" : "Not run"}
                    </span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <Link
                    className={styles.secondaryAction}
                    href={`/organiser/consultations/${consultation.id}/analysis`}
                  >
                    View Analysis
                  </Link>
                  <RunAnalysisButton
                    consultationId={consultation.id}
                    label={hasAnalysis ? "Re-run Analysis" : "Run Analysis"}
                    redirectTo={`/organiser/consultations/${consultation.id}/analysis`}
                  />
                  <Link
                    className={styles.secondaryAction}
                    href={`/organiser/consultations/${consultation.id}/simulator`}
                  >
                    Simulator
                  </Link>
                  <Link
                    className={styles.secondaryAction}
                    href={`/organiser/consultations/${consultation.id}/outcome/edit`}
                  >
                    Outcome
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
