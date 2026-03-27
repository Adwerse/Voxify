import Link from "next/link";
import { notFound } from "next/navigation";

import { getConsultation } from "@/lib/store";

import styles from "./page.module.css";

type ConsentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConsentPage(props: ConsentPageProps) {
  const { id } = await props.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Consent</h1>
        <p className={styles.intro}>
          Thanks for contributing to {consultation.title}. Please review before
          you continue.
        </p>

        <ul className={styles.list}>
          <li>Your participation is voluntary.</li>
          <li>
            This form collects optional nickname and broad demographic groups,
            not personal identifying details.
          </li>
          <li>
            Responses are analyzed in aggregate to improve decision-making and
            representation.
          </li>
          <li>You can skip any question you do not want to answer.</li>
        </ul>

        <div className={styles.actions}>
          <Link className={styles.secondaryButton} href={`/consultation/${id}`}>
            Back
          </Link>
          <Link
            className={styles.primaryButton}
            href={`/consultation/${id}/form`}
          >
            I understand and agree
          </Link>
        </div>
      </section>
    </main>
  );
}
