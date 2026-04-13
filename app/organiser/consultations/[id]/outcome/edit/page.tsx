import Link from "next/link";
import { notFound } from "next/navigation";

import { OutcomeEditor } from "@/components/outcome-editor";
import { getConsultation, getOutcome } from "@/lib/store";

import styles from "./page.module.css";

type OutcomeEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrganiserOutcomeEditPage(
  props: OutcomeEditPageProps,
) {
  const { id } = await props.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    notFound();
  }

  const existingOutcome = getOutcome(id) ?? null;

  return (
    <main className={styles.page}>
      <header className={styles.headerCard}>
        <p className={styles.eyebrow}>Organiser Dashboard</p>
        <h1 className={styles.title}>{consultation.title}</h1>
        <p className={styles.description}>
          Stage 4 (Close the Loop): publish what changed and why.
        </p>

        <div className={styles.topActions}>
          <Link className={styles.backLink} href="/organiser">
            Back to organiser home
          </Link>
          <Link
            className={styles.backLink}
            href={`/organiser/consultations/${id}/analysis`}
          >
            View analysis
          </Link>
          <Link
            className={styles.backLink}
            href={`/organiser/consultations/${id}/simulator`}
          >
            View simulator
          </Link>
        </div>
      </header>

      <OutcomeEditor consultationId={id} initialOutcome={existingOutcome} />
    </main>
  );
}
