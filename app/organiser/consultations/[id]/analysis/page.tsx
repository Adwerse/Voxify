import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportTabs } from "@/components/report-tabs";
import { RepresentationCharts } from "@/components/representation-charts";
import { RunAnalysisButton } from "@/components/run-analysis-button";
import { getConsultationAnalysis } from "@/lib/analysis-store";
import { getConsultation } from "@/lib/store";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type AnalysisPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrganiserAnalysisPage(props: AnalysisPageProps) {
  const { id } = await props.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    notFound();
  }

  const analysis = getConsultationAnalysis(id);

  const themeLabelById = new Map(
    (analysis?.themes ?? []).map((theme) => [theme.id, theme.label]),
  );

  return (
    <main className={styles.page}>
      <header className={styles.headerCard}>
        <p className={styles.eyebrow}>Organiser Dashboard</p>
        <h1 className={styles.title}>{consultation.title}</h1>
        <p className={styles.description}>
          Stage 2 (Analyse): themes, representation, and conflicting viewpoints.
        </p>

        <div className={styles.topActions}>
          <Link className={styles.backLink} href="/organiser">
            Back to organiser home
          </Link>
          <RunAnalysisButton
            consultationId={id}
            label={analysis ? "Re-run Analysis" : "Run Analysis"}
            variant="secondary"
          />
        </div>
      </header>

      {analysis ? (
        <>
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Theme Overview</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Theme</th>
                    <th>Description</th>
                    <th>Responses</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.themes.map((theme) => (
                    <tr key={theme.id}>
                      <td>{theme.label}</td>
                      <td>{theme.description || "—"}</td>
                      <td>{theme.responseIds.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Dual Reports</h2>
            <ReportTabs
              organiserBriefing={analysis.reports.organiserBriefing}
              studentSummary={analysis.reports.studentSummary}
            />
          </section>

          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Conflicting Viewpoints</h2>
            {analysis.conflicts.length === 0 ? (
              <p className={styles.muted}>
                No major internal conflicts were identified in this run.
              </p>
            ) : (
              <div className={styles.conflictsGrid}>
                {analysis.conflicts.map((conflict) => (
                  <article
                    className={styles.conflictCard}
                    key={conflict.themeId}
                  >
                    <h3 className={styles.conflictTitle}>
                      {themeLabelById.get(conflict.themeId) ?? conflict.themeId}
                    </h3>
                    {conflict.clusters.map((cluster) => (
                      <div className={styles.cluster} key={cluster.label}>
                        <h4 className={styles.clusterLabel}>{cluster.label}</h4>
                        <ul className={styles.quoteList}>
                          {cluster.exampleQuotes.slice(0, 3).map((quote) => (
                            <li key={quote}>{quote}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              Representation &amp; Missing Voices
            </h2>

            <RepresentationCharts
              ageBandCounts={analysis.representationStats.ageBandCounts}
              groupCounts={analysis.representationStats.groupCounts}
            />

            <div className={styles.tableWrap}>
              <h3 className={styles.subheading}>Theme × Group Share</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Theme</th>
                    <th>Group</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.themes.flatMap((theme) => {
                    const groupShares =
                      analysis.representationStats.themeBreakdown[theme.id]
                        ?.groupShares ?? {};

                    const entries = Object.entries(groupShares);
                    if (entries.length === 0) {
                      return [
                        <tr key={`${theme.id}-empty`}>
                          <td>{theme.label}</td>
                          <td>—</td>
                          <td>—</td>
                        </tr>,
                      ];
                    }

                    return entries.map(([group, share], entryIndex) => (
                      <tr key={`${theme.id}-${group}`}>
                        <td>{entryIndex === 0 ? theme.label : ""}</td>
                        <td>{group}</td>
                        <td>{`${(share * 100).toFixed(1)}%`}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.tableWrap}>
              <h3 className={styles.subheading}>Theme × Age Band Share</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Theme</th>
                    <th>Age Band</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.themes.flatMap((theme) => {
                    const ageBandShares =
                      analysis.representationStats.themeBreakdown[theme.id]
                        ?.ageBandShares ?? {};

                    const entries = Object.entries(ageBandShares);
                    if (entries.length === 0) {
                      return [
                        <tr key={`${theme.id}-age-empty`}>
                          <td>{theme.label}</td>
                          <td>—</td>
                          <td>—</td>
                        </tr>,
                      ];
                    }

                    return entries.map(([ageBand, share], entryIndex) => (
                      <tr key={`${theme.id}-${ageBand}`}>
                        <td>{entryIndex === 0 ? theme.label : ""}</td>
                        <td>{ageBand}</td>
                        <td>{`${(share * 100).toFixed(1)}%`}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.alertSection}>
              <h3 className={styles.subheading}>Underrepresentation Alerts</h3>
              {analysis.underrepresentationAlerts.length === 0 ? (
                <p className={styles.muted}>
                  No underrepresentation alerts in this run.
                </p>
              ) : (
                <ul className={styles.alertList}>
                  {analysis.underrepresentationAlerts.map((alert) => (
                    <li className={styles.alertItem} key={alert.group}>
                      <p>
                        <strong>{alert.group}</strong>: expected{" "}
                        {(alert.expectedShare * 100).toFixed(1)}%, actual{" "}
                        {(alert.actualShare * 100).toFixed(1)}%.
                      </p>
                      <p>{alert.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.narrativeSection}>
              <h3 className={styles.subheading}>Equity Narrative</h3>
              <p className={styles.narrative}>{analysis.equityNarrative}</p>
            </div>
          </section>
        </>
      ) : (
        <section className={styles.emptyState}>
          <h2 className={styles.sectionTitle}>No analysis cached yet</h2>
          <p className={styles.muted}>
            Run analysis to generate theme clustering, representation
            statistics, dual reports, and conflict highlights.
          </p>
        </section>
      )}
    </main>
  );
}
