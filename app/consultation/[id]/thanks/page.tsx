import Link from "next/link";
import { notFound } from "next/navigation";

import { getConsultation } from "@/lib/store";

import styles from "./page.module.css";

type ThanksPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ThanksPage(props: ThanksPageProps) {
  const { id } = await props.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Thanks for sharing your input</h1>
        <p className={styles.description}>
          Your response has been recorded for {consultation.title}. Organisers
          will use aggregate findings to analyse themes, representation, and
          trade-offs.
        </p>

        <p className={styles.note}>
          Later, you can check what happened with this consultation at{" "}
          <code className={styles.code}>{`/consultation/${id}/outcome`}</code>.
        </p>

        <div className={styles.actions}>
          <Link
            className={styles.secondaryButton}
            href={`/consultation/${id}/outcome`}
          >
            View outcome page
          </Link>
          <Link className={styles.secondaryButton} href={`/consultation/${id}`}>
            Back to consultation
          </Link>
        </div>
      </section>
    </main>
  );
}
