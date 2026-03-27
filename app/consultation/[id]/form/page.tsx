import { notFound } from "next/navigation";

import { ConsultationResponseForm } from "@/components/consultation-response-form";
import { getConsultation } from "@/lib/store";

import styles from "./page.module.css";

type FormPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FormPage(props: FormPageProps) {
  const { id } = await props.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    notFound();
  }

  const questionPrompts = consultation.questions.slice(0, 2);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>{consultation.title}</h1>
        <p className={styles.description}>
          Share your perspective. Optional nickname and aggregate demographics
          help identify missing voices.
        </p>

        <ConsultationResponseForm
          consultationId={consultation.id}
          questionPrompts={questionPrompts}
        />
      </section>
    </main>
  );
}
