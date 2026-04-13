import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
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

const THEME_COLORS = [
  "#1b69d2",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

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

  // Derived stats (only computed when analysis exists)
  const totalUniqueResponses = analysis
    ? new Set(analysis.themes.flatMap((t) => t.responseIds)).size
    : 0;
  const maxThemeResponses = analysis
    ? Math.max(...analysis.themes.map((t) => t.responseIds.length), 1)
    : 1;
  const groupCount = analysis
    ? Object.keys(analysis.representationStats.groupCounts).length
    : 0;
  const formattedDate = analysis
    ? new Date(analysis.generatedAt).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <main className={styles.page}>
      <header className={styles.headerCard}>
        <p className={styles.eyebrow}>Organiser Dashboard &rsaquo; Stage 2</p>
        <h1 className={styles.title}>{consultation.title}</h1>
        <p className={styles.description}>
          Theme clustering, representation analysis, dual reports, and
          conflicting viewpoints — all generated from participant responses.
        </p>

        <div className={styles.topActions}>
          <Link className={styles.backLink} href="/organiser">
            &larr; Back to Dashboard
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
          {/* ── Analysis summary strip ── */}
          <div className={styles.statsStrip}>
            <div className={styles.statsItem}>
              <span className={styles.statsValue}>{totalUniqueResponses}</span>
              <span className={styles.statsLabel}>responses analysed</span>
            </div>
            <div className={styles.statsDivider} />
            <div className={styles.statsItem}>
              <span className={styles.statsValue}>{analysis.themes.length}</span>
              <span className={styles.statsLabel}>themes identified</span>
            </div>
            <div className={styles.statsDivider} />
            <div className={styles.statsItem}>
              <span className={styles.statsValue}>{groupCount}</span>
              <span className={styles.statsLabel}>groups represented</span>
            </div>
            <div className={styles.statsDivider} />
            <div className={styles.statsItem}>
              <span className={styles.statsValue}>{formattedDate}</span>
              <span className={styles.statsLabel}>last analysed</span>
            </div>
          </div>

          {/* ── Theme Overview ── */}
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>&#128196;</span>
              Theme Overview
            </h2>
            <div className={styles.themesGrid}>
              {analysis.themes.map((theme, themeIndex) => (
                <div
                  className={styles.themeCard}
                  key={theme.id}
                  style={
                    {
                      "--theme-accent":
                        THEME_COLORS[themeIndex % THEME_COLORS.length],
                    } as React.CSSProperties
                  }
                >
                  <p className={styles.themeLabel}>{theme.label}</p>
                  {theme.description ? (
                    <p className={styles.themeDescription}>
                      {theme.description}
                    </p>
                  ) : null}
                  <div className={styles.themeFooter}>
                    <span className={styles.themeCount}>
                      {theme.responseIds.length}{" "}
                      {theme.responseIds.length === 1
                        ? "response"
                        : "responses"}
                    </span>
                    <span className={styles.themeShare}>
                      {totalUniqueResponses > 0
                        ? `${((theme.responseIds.length / totalUniqueResponses) * 100).toFixed(0)}%`
                        : "—"}
                    </span>
                  </div>
                  <div className={styles.themeBar}>
                    <div
                      className={styles.themeBarFill}
                      style={{
                        width: `${(theme.responseIds.length / maxThemeResponses) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Dual Reports ── */}
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>&#128209;</span>
              Dual Reports
            </h2>
            <p className={styles.sectionSubtext}>
              The same findings, written for two audiences: students who
              participated, and organisers making decisions.
            </p>
            <ReportTabs
              organiserBriefing={analysis.reports.organiserBriefing}
              studentSummary={analysis.reports.studentSummary}
            />
          </section>

          {/* ── Conflicting Viewpoints ── */}
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>&#9878;&#65039;</span>
              Conflicting Viewpoints
            </h2>
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

          {/* ── Representation & Missing Voices ── */}
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>&#128202;</span>
              Representation &amp; Missing Voices
            </h2>

            <RepresentationCharts
              ageBandCounts={analysis.representationStats.ageBandCounts}
              groupCounts={analysis.representationStats.groupCounts}
            />

            <div className={styles.tableWrap}>
              <h3 className={styles.subheading}>Theme &times; Group Share</h3>
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
              <h3 className={styles.subheading}>Theme &times; Age Band Share</h3>
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
                      <p className={styles.alertHeader}>
                        <span className={styles.alertIcon}>&#9888;&#65039;</span>
                        <strong>{alert.group}</strong>
                      </p>
                      <div className={styles.alertBars}>
                        <div className={styles.alertBarRow}>
                          <span className={styles.alertBarLabel}>Expected</span>
                          <div className={styles.alertBarTrack}>
                            <div
                              className={styles.alertBarExpected}
                              style={{
                                width: `${Math.min(alert.expectedShare * 300, 100)}%`,
                              }}
                            />
                          </div>
                          <span className={styles.alertBarValue}>
                            {(alert.expectedShare * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className={styles.alertBarRow}>
                          <span className={styles.alertBarLabel}>Actual</span>
                          <div className={styles.alertBarTrack}>
                            <div
                              className={styles.alertBarActual}
                              style={{
                                width: `${Math.min(alert.actualShare * 300, 100)}%`,
                              }}
                            />
                          </div>
                          <span className={styles.alertBarValue}>
                            {(alert.actualShare * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <p className={styles.alertMessage}>{alert.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.narrativeSection}>
              <h3 className={styles.narrativeTitle}>Equity Narrative</h3>
              <MarkdownContent content={analysis.equityNarrative} />
            </div>
          </section>

          {/* ── Bottom CTA ── */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaContent}>
              <p className={styles.ctaTitle}>Analysis complete</p>
              <p className={styles.ctaText}>
                Model proposed decisions against these findings to understand
                their impact on different student groups before committing.
              </p>
            </div>
            <Link
              className={styles.ctaButton}
              href={`/organiser/consultations/${id}/simulator`}
            >
              Open Decision Simulator &rarr;
            </Link>
          </section>
        </>
      ) : (
        <section className={styles.emptyState}>
          <h2
            className={styles.sectionTitle}
            style={{ justifyContent: "center" }}
          >
            No analysis cached yet
          </h2>
          <p className={styles.muted}>
            Run analysis to generate theme clustering, representation
            statistics, dual reports, and conflict highlights.
          </p>
        </section>
      )}
    </main>
  );
}
