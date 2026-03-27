import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getConsultation } from "@/lib/store";

import styles from "./page.module.css";

type ConsultationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConsultationPage(props: ConsultationPageProps) {
  const { id } = await props.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    notFound();
  }

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const formUrl = `${appBaseUrl}/consultation/${consultation.id}/form`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(formUrl)}`;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Student Consultation</p>
        <h1 className={styles.title}>{consultation.title}</h1>
        <p className={styles.description}>{consultation.description}</p>

        <div className={styles.metaRow}>
          <span>Approx. completion time: 2–3 minutes</span>
          <span>Status: {consultation.status}</span>
        </div>

        <div className={styles.actions}>
          <Link
            className={styles.primaryButton}
            href={`/consultation/${id}/consent`}
          >
            Start survey
          </Link>
          <Link
            className={styles.secondaryButton}
            href={`/consultation/${id}/form`}
          >
            Skip to form
          </Link>
        </div>

        <div className={styles.qrPanel}>
          <Image
            alt="QR code linking to the student form"
            className={styles.qrImage}
            height={160}
            src={qrCodeUrl}
            unoptimized
            width={160}
          />
          <p className={styles.qrCaption}>
            Scan to open this consultation form.
          </p>
        </div>
      </section>
    </main>
  );
}
