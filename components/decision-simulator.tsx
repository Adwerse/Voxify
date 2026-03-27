"use client";

import { useMemo, useState } from "react";

import type { DecisionImpactResult, DecisionProposal } from "@/types";

import styles from "./decision-simulator.module.css";

type DecisionSimulatorProps = {
  readonly consultationId: string;
  readonly initialProposals: DecisionProposal[];
  readonly hasAnalysis: boolean;
};

type ErrorPayload = {
  error?: string;
};

type DecisionApiSuccess = {
  success: boolean;
  decision: DecisionProposal;
};

type SimulationApiSuccess = {
  success: boolean;
  simulation: {
    results: DecisionImpactResult[];
  };
};

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ErrorPayload;
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
  } catch {
    return "Request failed. Please try again.";
  }

  return "Request failed. Please try again.";
}

export function DecisionSimulator({
  consultationId,
  initialProposals,
  hasAnalysis,
}: DecisionSimulatorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposals, setProposals] =
    useState<DecisionProposal[]>(initialProposals);
  const [results, setResults] = useState<DecisionImpactResult[] | null>(null);

  const [isSavingProposal, setIsSavingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const proposalById = useMemo(() => {
    return new Map(proposals.map((proposal) => [proposal.id, proposal]));
  }, [proposals]);

  async function onAddProposal() {
    setProposalError(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length === 0 || trimmedDescription.length === 0) {
      setProposalError("Both title and description are required.");
      return;
    }

    setIsSavingProposal(true);

    try {
      const response = await fetch(
        `/api/consultations/${consultationId}/decisions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: trimmedTitle,
            description: trimmedDescription,
          }),
        },
      );

      if (!response.ok) {
        setProposalError(await extractErrorMessage(response));
        return;
      }

      const payload = (await response.json()) as DecisionApiSuccess;
      setProposals((currentProposals) => [
        ...currentProposals,
        payload.decision,
      ]);
      setTitle("");
      setDescription("");
    } catch {
      setProposalError("Unable to save proposal right now.");
    } finally {
      setIsSavingProposal(false);
    }
  }

  async function onRunSimulation() {
    setSimulationError(null);
    setIsSimulating(true);

    try {
      const response = await fetch(
        `/api/consultations/${consultationId}/simulate`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        setSimulationError(await extractErrorMessage(response));
        return;
      }

      const payload = (await response.json()) as SimulationApiSuccess;
      setResults(payload.simulation.results);
    } catch {
      setSimulationError("Unable to run simulation right now.");
    } finally {
      setIsSimulating(false);
    }
  }

  const hasNoAnalysis = hasAnalysis === false;

  return (
    <section className={styles.layout}>
      <article className={styles.card}>
        <h2 className={styles.sectionTitle}>Proposal Entry</h2>
        <p className={styles.helpText}>
          Add 2–3 proposals describing what will change and who is affected.
        </p>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void onAddProposal();
          }}
        >
          <label className={styles.fieldLabel} htmlFor="proposal-title">
            Proposal title
          </label>
          <input
            className={styles.fieldInput}
            id="proposal-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Extend counselling hours"
            value={title}
          />

          <label className={styles.fieldLabel} htmlFor="proposal-description">
            Description
          </label>
          <textarea
            className={styles.fieldTextarea}
            id="proposal-description"
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Evening sessions launched for an 8-week pilot."
            rows={4}
            value={description}
          />

          {proposalError ? (
            <p className={styles.errorText}>{proposalError}</p>
          ) : null}

          <button
            className={styles.primaryButton}
            disabled={isSavingProposal}
            type="submit"
          >
            {isSavingProposal ? "Saving…" : "Add Proposal"}
          </button>
        </form>

        <div className={styles.listBlock}>
          <h3 className={styles.subheading}>Current proposals</h3>
          {proposals.length === 0 ? (
            <p className={styles.mutedText}>No proposals added yet.</p>
          ) : (
            <ul className={styles.proposalList}>
              {proposals.map((proposal) => (
                <li className={styles.proposalItem} key={proposal.id}>
                  <p className={styles.proposalTitle}>{proposal.title}</p>
                  <p className={styles.proposalDescription}>
                    {proposal.description}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      <article className={styles.card}>
        <h2 className={styles.sectionTitle}>Simulation Results</h2>
        <p className={styles.advisoryText}>
          This is advisory text, not a decision.
        </p>

        {hasNoAnalysis ? (
          <p className={styles.warningText}>
            Analysis is required before simulation. Run analysis first.
          </p>
        ) : null}

        <button
          className={styles.primaryButton}
          disabled={isSimulating || !hasAnalysis}
          onClick={onRunSimulation}
          type="button"
        >
          {isSimulating ? "Running simulation…" : "Run Simulation"}
        </button>

        {simulationError ? (
          <p className={styles.errorText}>{simulationError}</p>
        ) : null}

        {results === null ? (
          <p className={styles.mutedText}>
            Run simulation to see themes addressed, projected group impacts, and
            trade-offs.
          </p>
        ) : null}

        {results !== null && results.length === 0 ? (
          <p className={styles.mutedText}>No simulation output returned.</p>
        ) : null}

        {results !== null && results.length > 0 ? (
          <div className={styles.resultsGrid}>
            {results.map((result) => {
              const proposal = proposalById.get(result.proposalId);

              return (
                <article className={styles.resultCard} key={result.proposalId}>
                  <h3 className={styles.resultTitle}>
                    {proposal?.title ?? "Proposal"}
                  </h3>
                  {proposal?.description ? (
                    <p className={styles.resultDescription}>
                      {proposal.description}
                    </p>
                  ) : null}

                  <div className={styles.resultSection}>
                    <h4 className={styles.resultHeading}>Themes addressed</h4>
                    {result.themesAddressed.length === 0 ? (
                      <p className={styles.mutedText}>No themes mapped.</p>
                    ) : (
                      <ul className={styles.bulletList}>
                        {result.themesAddressed.map((theme) => (
                          <li key={theme}>{theme}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className={styles.resultSection}>
                    <h4 className={styles.resultHeading}>
                      Projected group impacts
                    </h4>
                    {result.projectedGroupNarratives.length === 0 ? (
                      <p className={styles.mutedText}>
                        No group narratives returned.
                      </p>
                    ) : (
                      <ul className={styles.bulletList}>
                        {result.projectedGroupNarratives.map((item) => (
                          <li key={`${result.proposalId}-${item.group}`}>
                            <strong>{item.group}:</strong> {item.narrative}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className={styles.resultSection}>
                    <h4 className={styles.resultHeading}>
                      Trade-off narrative
                    </h4>
                    <p className={styles.tradeOffText}>
                      {result.tradeOffNarrative}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </article>
    </section>
  );
}
