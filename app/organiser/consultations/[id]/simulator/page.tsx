import Link from "next/link";
import { notFound } from "next/navigation";

import { getConsultationAnalysis } from "@/lib/analysis-store";
import { getConsultation, listDecisions } from "@/lib/store";
import { DecisionSimulator } from "@/components/decision-simulator";

import styles from "./page.module.css";

type SimulatorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrganiserSimulatorPage(
  props: SimulatorPageProps,
) {
  const { id } = await props.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    notFound();
  }

  const hasAnalysis = Boolean(getConsultationAnalysis(id));
  const initialProposals = listDecisions();

  return (
    <main className={styles.page}>
      <header className={styles.headerCard}>
        <p className={styles.eyebrow}>Organiser Dashboard</p>
        <h1 className={styles.title}>{consultation.title}</h1>
        <p className={styles.description}>
          Stage 3 (Act): add decision proposals and simulate likely impacts.
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
        </div>
      </header>

      <DecisionSimulator
        consultationId={id}
        hasAnalysis={hasAnalysis}
        initialProposals={initialProposals}
      />
    </main>
  );
}
