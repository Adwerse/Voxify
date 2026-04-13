export type AgeBand = "16-17" | "18-21" | "22-25" | "other";

export type ParticipantMetadata = {
  ageBand: AgeBand;
  groups: string[];
  nickname?: string;
};

export type Response = {
  id: string;
  consultationId: string;
  answers: string[];
  meta: ParticipantMetadata;
  createdAt: string;
};

export type Consultation = {
  id: string;
  title: string;
  description: string;
  status: string;
  questions: string[];
};

export type DecisionProposal = {
  id: string;
  title: string;
  description: string;
};

export type Outcome = {
  consultationId: string;
  decisionTitle: string;
  decisionDescription: string;
  influencedByInput: boolean;
  organiserExplanation: string;
};

export type Theme = {
  id: string;
  label: string;
  description: string;
  responseIds: string[];
};

export type ConflictingViewpoint = {
  themeId: string;
  clusters: { label: string; exampleQuotes: string[] }[];
};

export type DecisionImpactResult = {
  proposalId: string;
  themesAddressed: string[];
  projectedGroupNarratives: { group: string; narrative: string }[];
  tradeOffNarrative: string;
};

export type RepresentationStats = {
  groupCounts: Record<string, number>;
  ageBandCounts: Record<string, number>;
  themeBreakdown: Record<
    string,
    {
      groupCounts: Record<string, number>;
      ageBandCounts: Record<string, number>;
      groupShares: Record<string, number>;
      ageBandShares: Record<string, number>;
    }
  >;
  expectedGroupShares: Record<string, number>;
  expectedAgeBandShares: Record<AgeBand, number>;
};

export type UnderrepresentationAlert = {
  group: string;
  expectedShare: number;
  actualShare: number;
  message: string;
};
