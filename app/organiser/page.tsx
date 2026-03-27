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
                  <span className={styles.statusTag}>
                    {consultation.status}
                  </span>
                </header>

                <div className={styles.statsGrid}>
                  <p>
                    <strong>Responses:</strong> {responseCount}
                  </p>
                  <p>
                    <strong>Proposals:</strong> {proposalCount}
                  </p>
                  <p>
                    <strong>Outcome:</strong>{" "}
                    {hasOutcome ? "Published" : "Pending"}
                  </p>
                  <p>
                    <strong>Analysis:</strong>{" "}
                    {hasAnalysis ? "Available" : "Not yet run"}
                  </p>
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
