import Link from "next/link";

import { listConsultations } from "@/lib/store";

import styles from "./page.module.css";

export default function Home() {
  const consultations = listConsultations();
  const activeConsultations = consultations.filter(
    (consultation) => consultation.status === "open",
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Youth Voice Aggregator</p>
        <h1 className={styles.heroTitle}>Voxify</h1>
        <p className={styles.heroSubtitle}>
          From student input to measurable, equitable, traceable impact —
          across four stages: Collect, Analyse, Act, and Close the Loop.
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.primaryButton} href="/organiser">
            Organiser Dashboard
          </Link>
        </div>
        {activeConsultations.length > 0 && (
          <p className={styles.heroMeta}>
            {activeConsultations.length}{" "}
            {activeConsultations.length === 1
              ? "consultation"
              : "consultations"}{" "}
            open for responses right now
          </p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Active Consultations</h2>
          {activeConsultations.length > 0 && (
            <span className={styles.sectionBadge}>
              {activeConsultations.length} open
            </span>
          )}
        </div>
        {activeConsultations.length === 0 ? (
          <p className={styles.mutedText}>
            No open consultations right now. Check back soon or visit the
            organiser dashboard.
          </p>
        ) : (
          <div className={styles.grid}>
            {activeConsultations.map((consultation) => (
              <article className={styles.card} key={consultation.id}>
                <div className={styles.cardMeta}>
                  <span className={styles.statusBadge}>● Open</span>
                  <span className={styles.questionCount}>
                    {consultation.questions.length}{" "}
                    {consultation.questions.length === 1
                      ? "question"
                      : "questions"}
                  </span>
                </div>
                <h3 className={styles.cardTitle}>{consultation.title}</h3>
                <p className={styles.cardDescription}>
                  {consultation.description}
                </p>
                <div className={styles.cardActions}>
                  <Link
                    className={styles.primaryButton}
                    href={`/consultation/${consultation.id}/consent`}
                  >
                    Participate
                  </Link>
                  <Link
                    className={styles.secondaryButton}
                    href={`/consultation/${consultation.id}`}
                  >
                    Learn more
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.stagesSection}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <div className={styles.stagesGrid}>
          <div className={styles.stage}>
            <span className={styles.stageNumber}>1</span>
            <h3 className={styles.stageTitle}>Collect</h3>
            <p className={styles.stageText}>
              Frictionless QR-based micro-polls. No account, no app download,
              no login required.
            </p>
          </div>
          <div className={styles.stage}>
            <span className={styles.stageNumber}>2</span>
            <h3 className={styles.stageTitle}>Analyse</h3>
            <p className={styles.stageText}>
              AI theme clustering, dual-audience reports, and the Missing Voices
              Engine flags underrepresented groups.
            </p>
          </div>
          <div className={styles.stage}>
            <span className={styles.stageNumber}>3</span>
            <h3 className={styles.stageTitle}>Act</h3>
            <p className={styles.stageText}>
              The Decision Impact Simulator models proposed actions before
              committing — showing trade-offs by group.
            </p>
          </div>
          <div className={styles.stage}>
            <span className={styles.stageNumber}>4</span>
            <h3 className={styles.stageTitle}>Close the Loop</h3>
            <p className={styles.stageText}>
              Outcome notifications tell students what changed because of what
              they said — or why it did not.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
