import "server-only";

import { addResponses, listConsultations, listResponses } from "@/lib/store";
import type { AgeBand, Response as ConsultationResponse } from "@/types";

type DemoSeedResultReason =
  | "seeded"
  | "non_development_environment"
  | "disabled_by_flag"
  | "already_attempted"
  | "no_consultation"
  | "minimum_already_met";

export type DemoSeedResult = {
  seeded: boolean;
  reason: DemoSeedResultReason;
  consultationId?: string;
  existingCount: number;
  addedCount: number;
  totalCount: number;
};

type EnsureDemoSeedOptions = {
  consultationId?: string;
  minimumResponses?: number;
  force?: boolean;
};

type SeedProfile = {
  ageBand: AgeBand;
  groups: string[];
};

const DEFAULT_MINIMUM_RESPONSES = 56;
const ENABLE_DEMO_SEED_FLAG = "VOXIFY_ENABLE_DEMO_SEED";

const challenges = [
  "Canteen queues are too long between lectures",
  "Mental health appointment slots are difficult to access",
  "Evening transport options to campus are limited",
  "Library quiet zones fill up too quickly during assessment weeks",
  "Group project rooms are often fully booked",
  "Wi-Fi stability in older buildings is inconsistent",
  "Finding affordable healthy food on campus is difficult",
  "Accessibility signage around some lecture halls is unclear",
  "Part-time students struggle with timetable clashes",
  "Induction guidance for new international students feels fragmented",
];

const suggestions = [
  "Add a live occupancy board for canteen and study spaces",
  "Reserve same-week wellbeing check-in slots",
  "Pilot a late shuttle on peak teaching days",
  "Open more short-booking study pods during exams",
  "Publish room availability with 30-minute updates",
  "Prioritize network upgrades in high-traffic corridors",
  "Offer low-cost meal bundles at lunchtime",
  "Improve wayfinding and inclusive signage",
  "Record key sessions for students with work commitments",
  "Create a single onboarding checklist for international arrivals",
];

const outcomeExpectations = [
  "I want to see visible updates before next term",
  "A monthly progress note from organisers would help",
  "Please include student reps in follow-up decisions",
  "A transparent timeline would increase trust",
  "Share what cannot be changed yet and why",
];

const seedProfiles: SeedProfile[] = [
  { ageBand: "18-21", groups: ["first-year", "commuter"] },
  { ageBand: "18-21", groups: ["first-year"] },
  { ageBand: "18-21", groups: ["international"] },
  { ageBand: "18-21", groups: ["commuter"] },
  { ageBand: "22-25", groups: ["postgraduate"] },
  { ageBand: "22-25", groups: ["postgraduate", "international"] },
  { ageBand: "22-25", groups: ["mature", "commuter"] },
  { ageBand: "other", groups: ["disabled"] },
  { ageBand: "16-17", groups: ["first-year"] },
  { ageBand: "other", groups: ["mature"] },
];

let hasAttemptedAutoSeed = false;

function isDemoSeedEnabled(): boolean {
  const configuredValue = process.env[ENABLE_DEMO_SEED_FLAG];

  if (configuredValue === undefined) {
    return true;
  }

  const normalizedValue = configuredValue.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalizedValue);
}

function buildSyntheticResponses(
  consultationId: string,
  responseCount: number,
): Omit<ConsultationResponse, "id" | "createdAt">[] {
  const now = Date.now();

  return Array.from({ length: responseCount }, (_, index) => {
    const profile = seedProfiles[index % seedProfiles.length];
    const challenge = challenges[index % challenges.length];
    const suggestion = suggestions[(index * 2) % suggestions.length];
    const outcomeExpectation =
      outcomeExpectations[(index * 3) % outcomeExpectations.length];

    const answers = [`${challenge}.`, `${suggestion}. ${outcomeExpectation}.`];

    return {
      consultationId,
      answers,
      meta: {
        ageBand: profile.ageBand,
        groups: profile.groups,
      },
      createdAt: new Date(
        now - (responseCount - index) * 30 * 60 * 1000,
      ).toISOString(),
    };
  });
}

function resolveConsultationId(requestedId?: string): string | undefined {
  if (requestedId && requestedId.trim().length > 0) {
    return requestedId;
  }

  const firstConsultation = listConsultations()[0];
  return firstConsultation?.id;
}

export function ensureDemoResponsesSeeded(
  options: EnsureDemoSeedOptions = {},
): DemoSeedResult {
  const minimumResponses =
    options.minimumResponses ?? DEFAULT_MINIMUM_RESPONSES;

  if (!options.force && process.env.NODE_ENV !== "development") {
    return {
      seeded: false,
      reason: "non_development_environment",
      existingCount: 0,
      addedCount: 0,
      totalCount: 0,
    };
  }

  if (!options.force && !isDemoSeedEnabled()) {
    return {
      seeded: false,
      reason: "disabled_by_flag",
      existingCount: 0,
      addedCount: 0,
      totalCount: 0,
    };
  }

  if (!options.force && hasAttemptedAutoSeed) {
    return {
      seeded: false,
      reason: "already_attempted",
      existingCount: 0,
      addedCount: 0,
      totalCount: 0,
    };
  }

  if (!options.force) {
    hasAttemptedAutoSeed = true;
  }

  const consultationId = resolveConsultationId(options.consultationId);
  if (!consultationId) {
    return {
      seeded: false,
      reason: "no_consultation",
      existingCount: 0,
      addedCount: 0,
      totalCount: 0,
    };
  }

  const existingCount = listResponses(consultationId).length;
  if (existingCount >= minimumResponses) {
    return {
      seeded: false,
      reason: "minimum_already_met",
      consultationId,
      existingCount,
      addedCount: 0,
      totalCount: existingCount,
    };
  }

  const responsesToAdd = minimumResponses - existingCount;
  const syntheticResponses = buildSyntheticResponses(
    consultationId,
    responsesToAdd,
  );

  const createdResponses = addResponses(syntheticResponses);
  const totalCount = existingCount + createdResponses.length;

  return {
    seeded: true,
    reason: "seeded",
    consultationId,
    existingCount,
    addedCount: createdResponses.length,
    totalCount,
  };
}
