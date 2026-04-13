import type {
  AgeBand,
  RepresentationStats,
  Response as ConsultationResponse,
  Theme,
  UnderrepresentationAlert,
} from "@/types";

type BuildRepresentationStatsOptions = {
  readonly expectedGroupShares?: Record<string, number>;
  readonly expectedAgeBandShares?: Record<AgeBand, number>;
};

type BuildUnderrepresentationAlertsOptions = {
  readonly expectedGroupShares?: Record<string, number>;
  readonly thresholdFactor?: number;
};

const DEFAULT_THRESHOLD_FACTOR = 0.5;

export const DEFAULT_EXPECTED_GROUP_SHARES: Record<string, number> = {
  "first-year": 0.25,
  commuter: 0.2,
  international: 0.15,
  disabled: 0.12,
  postgraduate: 0.18,
  mature: 0.1,
};

export const DEFAULT_EXPECTED_AGE_BAND_SHARES: Record<AgeBand, number> = {
  "16-17": 0.12,
  "18-21": 0.56,
  "22-25": 0.22,
  other: 0.1,
};

function incrementCount(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1;
}

function normalizeGroupLabel(value: string): string {
  return value.trim().toLowerCase();
}

function getUniqueGroups(response: ConsultationResponse): string[] {
  return [
    ...new Set(response.meta.groups.map((group) => normalizeGroupLabel(group))),
  ].filter((group) => group.length > 0);
}

function calculateShares(
  counts: Record<string, number>,
  total: number,
): Record<string, number> {
  if (total <= 0) {
    return {};
  }

  const shares: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) {
    shares[key] = value / total;
  }

  return shares;
}

function buildThemeRepresentation(
  theme: Theme,
  responseById: Map<string, ConsultationResponse>,
): RepresentationStats["themeBreakdown"][string] {
  const groupCounts: Record<string, number> = {};
  const ageBandCounts: Record<string, number> = {};
  let totalGroupMentions = 0;
  let totalResponses = 0;

  for (const responseId of theme.responseIds) {
    const response = responseById.get(responseId);
    if (!response) {
      continue;
    }

    totalResponses += 1;
    incrementCount(ageBandCounts, response.meta.ageBand);

    for (const group of getUniqueGroups(response)) {
      incrementCount(groupCounts, group);
      totalGroupMentions += 1;
    }
  }

  return {
    groupCounts,
    ageBandCounts,
    groupShares: calculateShares(groupCounts, totalGroupMentions),
    ageBandShares: calculateShares(ageBandCounts, totalResponses),
  };
}

export function buildRepresentationStats(
  responses: ConsultationResponse[],
  themes: Theme[],
  options: BuildRepresentationStatsOptions = {},
): RepresentationStats {
  const groupCounts: Record<string, number> = {};
  const ageBandCounts: Record<string, number> = {};
  const responseById = new Map(
    responses.map((response) => [response.id, response]),
  );

  for (const response of responses) {
    incrementCount(ageBandCounts, response.meta.ageBand);

    for (const group of getUniqueGroups(response)) {
      incrementCount(groupCounts, group);
    }
  }

  const themeBreakdown: RepresentationStats["themeBreakdown"] = {};
  for (const theme of themes) {
    themeBreakdown[theme.id] = buildThemeRepresentation(theme, responseById);
  }

  return {
    groupCounts,
    ageBandCounts,
    themeBreakdown,
    expectedGroupShares:
      options.expectedGroupShares ?? DEFAULT_EXPECTED_GROUP_SHARES,
    expectedAgeBandShares:
      options.expectedAgeBandShares ?? DEFAULT_EXPECTED_AGE_BAND_SHARES,
  };
}

export function buildUnderrepresentationAlerts(
  stats: RepresentationStats,
  options: BuildUnderrepresentationAlertsOptions = {},
): UnderrepresentationAlert[] {
  const thresholdFactor = options.thresholdFactor ?? DEFAULT_THRESHOLD_FACTOR;
  const expectedGroupShares =
    options.expectedGroupShares ?? stats.expectedGroupShares;
  const totalResponses = Object.values(stats.ageBandCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  if (totalResponses === 0) {
    return [];
  }

  return Object.entries(expectedGroupShares)
    .map(([group, expectedShare]) => {
      if (expectedShare <= 0) {
        return null;
      }

      const actualShare = (stats.groupCounts[group] ?? 0) / totalResponses;
      if (actualShare >= expectedShare * thresholdFactor) {
        return null;
      }

      return {
        group,
        expectedShare,
        actualShare,
        message:
          "Participation for this group is below the configured baseline. Interpret findings carefully due to sampling limits.",
      } satisfies UnderrepresentationAlert;
    })
    .filter((alert): alert is UnderrepresentationAlert => alert !== null);
}
