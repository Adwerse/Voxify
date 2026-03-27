import Link from "next/link";
import { notFound } from "next/navigation";

import { getConsultationAnalysis } from "@/lib/analysis-store";
import { getConsultation, getOutcome } from "@/lib/store";

import styles from "./page.module.css";

type ConsultationOutcomePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConsultationOutcomePage(
  props: ConsultationOutcomePageProps,
) {
  const { id } = await props.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    notFound();
  }

  const analysis = getConsultationAnalysis(id);
  const outcome = getOutcome(id);

  const highlightedThemes = [...(analysis?.themes ?? [])]
    .sort(
      (themeA, themeB) => themeB.responseIds.length - themeA.responseIds.length,
    )
    .slice(0, 4);

  return (
    <main className={styles.page}>
      <header className={styles.headerCard}>
        <p className={styles.eyebrow}>Consultation Outcome</p>
        <h1 className={styles.title}>{consultation.title}</h1>
        <p className={styles.description}>
          Stage 4 (Close the Loop): what we heard and what action is being
          taken.
        </p>
      </header>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Consultation summary</h2>
        <p className={styles.summaryText}>{consultation.description}</p>
        {consultation.questions.length > 0 ? (
          <ul className={styles.bulletList}>
            {consultation.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.mutedText}>
            No consultation questions recorded.
          </p>
        )}
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Highlighted themes</h2>
        {highlightedThemes.length === 0 ? (
          <p className={styles.mutedText}>
            Theme analysis is not available yet. Organisers may still be
            processing responses.
          </p>
        ) : (
          <div className={styles.themeGrid}>
            {highlightedThemes.map((theme) => (
              <article className={styles.themeCard} key={theme.id}>
                <h3 className={styles.themeLabel}>{theme.label}</h3>
                <p className={styles.themeDescription}>
                  {theme.description || "No summary provided."}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Decision outcome</h2>
        {outcome ? (
          <>
            <h3 className={styles.outcomeTitle}>{outcome.decisionTitle}</h3>
            <p className={styles.outcomeDescription}>
              {outcome.decisionDescription}
            </p>
            <p className={styles.influenceTag}>
              {outcome.influencedByInput
                ? "Student input influenced this decision."
                : "This decision was not directly influenced by student input."}
            </p>
            <p className={styles.explanation}>{outcome.organiserExplanation}</p>

            <div className={styles.splitGrid}>
              <article className={styles.splitCard}>
                <h4 className={styles.splitHeading}>What we heard</h4>
                {highlightedThemes.length === 0 ? (
                  <p className={styles.mutedText}>Theme summary is pending.</p>
                ) : (
                  <ul className={styles.bulletList}>
                    {highlightedThemes.map((theme) => (
                      <li key={`heard-${theme.id}`}>{theme.label}</li>
                    ))}
                  </ul>
                )}
              </article>

              <article className={styles.splitCard}>
                <h4 className={styles.splitHeading}>What we&apos;re doing</h4>
                <ul className={styles.bulletList}>
                  <li>{outcome.decisionTitle}</li>
                  <li>{outcome.decisionDescription}</li>
                </ul>
              </article>
            </div>
          </>
        ) : (
          <p className={styles.mutedText}>
            This outcome has not been published yet. Please check back soon.
          </p>
        )}
      </section>

      <section className={styles.footerActions}>
        <Link className={styles.backLink} href={`/consultation/${id}`}>
          Back to consultation page
        </Link>
      </section>
    </main>
  );
}
