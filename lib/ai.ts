import "server-only";

import { generateClaudeText } from "@/lib/claude";
import { readPromptTemplate } from "@/lib/prompts";
import type {
  ConflictingViewpoint,
  DecisionImpactResult,
  DecisionProposal,
  RepresentationStats,
  Response as ConsultationResponse,
  Theme,
  UnderrepresentationAlert,
} from "@/types";

const BASE_SYSTEM_PROMPT =
  "You are a neutral civic-tech assistant. You must not take sides on policy. Your job is to explain trade-offs and representation patterns in plain language. Do not provide legal advice or policy endorsements. Always include caveats around sample size and sampling bias when relevant.";

function buildSystemPrompt(
  templateName: Parameters<typeof readPromptTemplate>[0],
): string {
  return `${BASE_SYSTEM_PROMPT}\n\n${readPromptTemplate(templateName)}`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

function sanitizeJsonLikeText(input: string): string {
  let sanitized = input
    .replaceAll(/[\u201C\u201D]/g, '"')
    .replaceAll(/[\u2018\u2019]/g, "'")
    .replaceAll("\r\n", "\n");

  const trailingCommaPattern = /,\s*([}\]])/g;

  while (trailingCommaPattern.test(sanitized)) {
    sanitized = sanitized.replaceAll(trailingCommaPattern, "$1");
  }

  return sanitized;
}

function extractJsonCandidate(input: string): string | null {
  const jsonStart = input.search(/[[{]/);
  const jsonEnd = Math.max(input.lastIndexOf("}"), input.lastIndexOf("]"));

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  return input.slice(jsonStart, jsonEnd + 1);
}

function extractRegexJsonCandidates(input: string): string[] {
  const candidates = new Set<string>();

  for (const match of input.matchAll(/(\{[\s\S]*?\}|\[[\s\S]*?\])/g)) {
    const candidate = match[1]?.trim();
    if (candidate) {
      candidates.add(candidate);
    }
  }

  return [...candidates];
}

function parseJsonPayload<T>(rawText: string): T | null {
  const normalized = stripCodeFence(rawText);

  const extracted = extractJsonCandidate(normalized);
  const regexCandidates = extractRegexJsonCandidates(normalized);
  const candidates = [
    normalized,
    extracted,
    ...regexCandidates,
    sanitizeJsonLikeText(normalized),
    extracted ? sanitizeJsonLikeText(extracted) : null,
    ...regexCandidates.map((candidate) => sanitizeJsonLikeText(candidate)),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  return null;
}

function buildFallbackThemes(responses: ConsultationResponse[]): Theme[] {
  if (responses.length === 0) {
    return [];
  }

  return [
    {
      id: crypto.randomUUID(),
      label: "General Feedback",
      description:
        "Fallback grouping used because structured model output was not parseable for this run.",
      responseIds: responses.map((response) => response.id),
    },
  ];
}

function buildFallbackReports(
  themes: Theme[],
  responseCount: number,
): { studentSummary: string; organiserBriefing: string } {
  const topTheme =
    themes
      .slice()
      .sort((left, right) => right.responseIds.length - left.responseIds.length)
      .at(0)?.label ?? "General Feedback";

  return {
    studentSummary: `We received ${responseCount} responses. The strongest signal in this run is ${topTheme}. This summary is generated with a fallback mode because structured AI output could not be parsed exactly; treat it as directional and not comprehensive.`,
    organiserBriefing: `Processed ${responseCount} responses. Top theme: ${topTheme}. This report used fallback generation because structured AI JSON was malformed in this run. Re-run analysis after additional responses or prompt tuning, and interpret findings with sampling and representation caveats.`,
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeThemes(themes: unknown): Theme[] {
  if (!Array.isArray(themes)) {
    return [];
  }

  return themes
    .map((theme) => {
      if (!theme || typeof theme !== "object") {
        return null;
      }

      const candidate = theme as Record<string, unknown>;
      const id =
        typeof candidate.id === "string" ? candidate.id : crypto.randomUUID();
      const label =
        typeof candidate.label === "string"
          ? candidate.label
          : "Unlabelled Theme";
      const description =
        typeof candidate.description === "string" ? candidate.description : "";
      const responseIds = toStringArray(candidate.responseIds);

      return {
        id,
        label,
        description,
        responseIds,
      } satisfies Theme;
    })
    .filter((theme): theme is Theme => theme !== null);
}

function normalizeConflicts(conflicts: unknown): ConflictingViewpoint[] {
  if (!Array.isArray(conflicts)) {
    return [];
  }

  return conflicts
    .map((conflict) => {
      if (!conflict || typeof conflict !== "object") {
        return null;
      }

      const candidate = conflict as Record<string, unknown>;
      if (typeof candidate.themeId !== "string") {
        return null;
      }

      const clusters = Array.isArray(candidate.clusters)
        ? candidate.clusters
            .map((cluster) => {
              if (!cluster || typeof cluster !== "object") {
                return null;
              }

              const clusterCandidate = cluster as Record<string, unknown>;
              if (typeof clusterCandidate.label !== "string") {
                return null;
              }

              return {
                label: clusterCandidate.label,
                exampleQuotes: toStringArray(clusterCandidate.exampleQuotes),
              };
            })
            .filter(
              (
                cluster,
              ): cluster is { label: string; exampleQuotes: string[] } =>
                cluster !== null,
            )
        : [];

      return {
        themeId: candidate.themeId,
        clusters,
      } satisfies ConflictingViewpoint;
    })
    .filter((conflict): conflict is ConflictingViewpoint => conflict !== null);
}

function normalizeSimulationResults(results: unknown): DecisionImpactResult[] {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((result) => {
      if (!result || typeof result !== "object") {
        return null;
      }

      const candidate = result as Record<string, unknown>;
      if (typeof candidate.proposalId !== "string") {
        return null;
      }

      const projectedGroupNarratives = Array.isArray(
        candidate.projectedGroupNarratives,
      )
        ? candidate.projectedGroupNarratives
            .map((groupNarrative) => {
              if (!groupNarrative || typeof groupNarrative !== "object") {
                return null;
              }

              const groupCandidate = groupNarrative as Record<string, unknown>;
              if (
                typeof groupCandidate.group !== "string" ||
                typeof groupCandidate.narrative !== "string"
              ) {
                return null;
              }

              return {
                group: groupCandidate.group,
                narrative: groupCandidate.narrative,
              };
            })
            .filter(
              (narrative): narrative is { group: string; narrative: string } =>
                narrative !== null,
            )
        : [];

      return {
        proposalId: candidate.proposalId,
        themesAddressed: toStringArray(candidate.themesAddressed),
        projectedGroupNarratives,
        tradeOffNarrative:
          typeof candidate.tradeOffNarrative === "string"
            ? candidate.tradeOffNarrative
            : "",
      } satisfies DecisionImpactResult;
    })
    .filter((result): result is DecisionImpactResult => result !== null);
}

export async function clusterThemes(
  responses: ConsultationResponse[],
  consultationContext?: Record<string, unknown>,
): Promise<Theme[]> {
  const userPrompt = JSON.stringify(
    {
      consultationContext: consultationContext ?? {},
      responses: responses.map((response) => ({
        id: response.id,
        answers: response.answers,
      })),
      outputFormat: {
        themes: [
          {
            id: "string",
            label: "string",
            description: "string",
            responseIds: ["string"],
          },
        ],
      },
      requirement: "Return valid JSON only.",
    },
    null,
    2,
  );

  const raw = await generateClaudeText({
    systemPrompt: buildSystemPrompt("theme-clustering"),
    userPrompt,
  });

  const parsed = parseJsonPayload<{ themes?: unknown }>(raw);
  const normalizedThemes = normalizeThemes(parsed?.themes);

  if (normalizedThemes.length > 0) {
    return normalizedThemes;
  }

  return buildFallbackThemes(responses);
}

export async function generateDualReports(
  themes: Theme[],
  responses: ConsultationResponse[],
  representationStats: RepresentationStats,
  underrepresentationAlerts: UnderrepresentationAlert[] = [],
  sampleQuotes: string[] = [],
): Promise<{ studentSummary: string; organiserBriefing: string }> {
  const userPrompt = JSON.stringify(
    {
      themes,
      responseCount: responses.length,
      representationStats,
      underrepresentationAlerts,
      sampleQuotes,
      outputFormat: {
        studentSummary: "string",
        organiserBriefing: "string",
      },
      requirement: "Return valid JSON only.",
    },
    null,
    2,
  );

  const raw = await generateClaudeText({
    systemPrompt: buildSystemPrompt("dual-reports"),
    userPrompt,
  });

  const parsed = parseJsonPayload<{
    studentSummary?: unknown;
    organiserBriefing?: unknown;
  }>(raw);

  const studentSummary =
    typeof parsed?.studentSummary === "string" ? parsed.studentSummary : "";
  const organiserBriefing =
    typeof parsed?.organiserBriefing === "string"
      ? parsed.organiserBriefing
      : "";

  if (studentSummary.trim().length > 0 || organiserBriefing.trim().length > 0) {
    return {
      studentSummary,
      organiserBriefing,
    };
  }

  return buildFallbackReports(themes, responses.length);
}

export async function detectConflictingViewpoints(
  themes: Theme[],
  responses: ConsultationResponse[],
): Promise<ConflictingViewpoint[]> {
  const userPrompt = JSON.stringify(
    {
      themes,
      responses: responses.map((response) => ({
        id: response.id,
        answers: response.answers,
      })),
      outputFormat: {
        conflicts: [
          {
            themeId: "string",
            clusters: [
              {
                label: "string",
                exampleQuotes: ["string"],
              },
            ],
          },
        ],
      },
      requirement: "Return valid JSON only.",
    },
    null,
    2,
  );

  const raw = await generateClaudeText({
    systemPrompt: buildSystemPrompt("conflicting-viewpoints"),
    userPrompt,
  });

  const parsed = parseJsonPayload<{ conflicts?: unknown }>(raw);
  return normalizeConflicts(parsed?.conflicts);
}

export async function generateEquityNarrative(
  representationStats: RepresentationStats,
  underrepresentationAlerts: UnderrepresentationAlert[],
): Promise<string> {
  const userPrompt = JSON.stringify(
    {
      representationStats,
      underrepresentationAlerts,
      requirement:
        "Return only plain text. Keep it concise. Include sample-size and representativeness caveats.",
    },
    null,
    2,
  );

  return generateClaudeText({
    systemPrompt: buildSystemPrompt("equity-narrative"),
    userPrompt,
  });
}

export async function simulateDecisionImpact(
  proposals: DecisionProposal[],
  themes: Theme[],
  representationStats: RepresentationStats,
): Promise<DecisionImpactResult[]> {
  const userPrompt = JSON.stringify(
    {
      proposals,
      themes,
      representationStats,
      outputFormat: {
        results: [
          {
            proposalId: "string",
            themesAddressed: ["string"],
            projectedGroupNarratives: [
              {
                group: "string",
                narrative: "string",
              },
            ],
            tradeOffNarrative: "string",
          },
        ],
      },
      requirement: "Return valid JSON only.",
    },
    null,
    2,
  );

  const raw = await generateClaudeText({
    systemPrompt: buildSystemPrompt("decision-impact"),
    userPrompt,
  });

  const parsed = parseJsonPayload<{ results?: unknown }>(raw);
  const normalizedResults = normalizeSimulationResults(parsed?.results);

  if (normalizedResults.length > 0) {
    return normalizedResults;
  }

  const fallbackThemeLabels = themes.map((theme) => theme.label).slice(0, 3);
  const knownGroups = Object.keys(representationStats.groupCounts).slice(0, 3);

  return proposals.map((proposal) => ({
    proposalId: proposal.id,
    themesAddressed: fallbackThemeLabels,
    projectedGroupNarratives:
      knownGroups.length === 0
        ? []
        : knownGroups.map((group) => ({
            group,
            narrative:
              "Projected impact unavailable from structured AI output in this run; review manually with representation caveats.",
          })),
    tradeOffNarrative:
      "Fallback simulation generated because structured AI output was malformed. Treat this as a placeholder and re-run for a full scenario narrative.",
  }));
}
