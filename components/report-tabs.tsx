"use client";

import { useMemo, useState } from "react";

import { MarkdownContent } from "./markdown-content";
import styles from "./report-tabs.module.css";

type ReportTabsProps = {
  readonly studentSummary: string;
  readonly organiserBriefing: string;
};

type ReportTab = "student" | "organiser";

export function ReportTabs({
  studentSummary,
  organiserBriefing,
}: ReportTabsProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("student");

  const activeContent = useMemo(() => {
    return activeTab === "student" ? studentSummary : organiserBriefing;
  }, [activeTab, organiserBriefing, studentSummary]);

  return (
    <section className={styles.container}>
      <div className={styles.tabRow} role="tablist">
        <button
          aria-selected={activeTab === "student"}
          className={`${styles.tab} ${activeTab === "student" ? styles.active : ""}`}
          onClick={() => setActiveTab("student")}
          role="tab"
          type="button"
        >
          <span className={styles.tabIcon}>&#128100;</span>
          Student Summary
        </button>
        <button
          aria-selected={activeTab === "organiser"}
          className={`${styles.tab} ${activeTab === "organiser" ? styles.active : ""}`}
          onClick={() => setActiveTab("organiser")}
          role="tab"
          type="button"
        >
          <span className={styles.tabIcon}>&#128203;</span>
          Organiser Briefing
        </button>
      </div>

      <div className={styles.content}>
        <MarkdownContent content={activeContent} />
      </div>
    </section>
  );
}
