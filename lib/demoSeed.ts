import "server-only";

import { addResponses, listConsultations, listResponses } from "@/lib/store";
import type { AgeBand, Response as ConsultationResponse } from "@/types";

type DemoSeedResultReason =
  | "seeded"
  | "non_development_environment"
  | "disabled_by_flag"
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

type ConsultationContent = {
  challenges: string[];
  suggestions: string[];
};

const DEFAULT_MINIMUM_RESPONSES = 56;
const ENABLE_DEMO_SEED_FLAG = "VOXIFY_ENABLE_DEMO_SEED";

// ─── Topic-specific content libraries ───────────────────────────────────────

const contentByTopic: Record<string, ConsultationContent> = {
  wellbeing: {
    challenges: [
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
    ],
    suggestions: [
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
    ],
  },
  transport: {
    challenges: [
      "Bus routes to campus are unreliable and often late",
      "Train fares for students have increased significantly this year",
      "There is no safe cycling infrastructure between the station and campus",
      "Late evening transport options disappear after 9 pm",
      "Campus car park costs are prohibitive for commuting students",
      "The last bus home leaves before evening lectures finish",
      "Bike storage facilities on campus are insufficient and insecure",
      "Park-and-ride services are not integrated with term-time timetables",
      "Students with disabilities find public transport routes inaccessible",
      "Information about transport options is scattered across different platforms",
    ],
    suggestions: [
      "Run a subsidised campus shuttle between the train station and main buildings",
      "Partner with real-time transit apps to provide live journey information",
      "Install covered, secure bike storage near every campus entrance",
      "Negotiate discounted student rail and bus passes with local operators",
      "Extend the last evening bus to match late seminar finish times",
      "Introduce a campus rideshare matching scheme for commuting students",
      "Create a dedicated cycling lane on the main campus access road",
      "Offer emergency taxi vouchers for students stranded after late events",
      "Provide a live travel disruption alert board in the student hub",
      "Add flexible timetable options so commuters can avoid peak-hour fares",
    ],
  },
  food: {
    challenges: [
      "Canteen queues take 20–30 minutes during the lunch rush",
      "Healthy food options are expensive compared to nearby shops",
      "Students with dietary requirements struggle to find suitable meals",
      "The main cafe closes at 3 pm, leaving evening students without food",
      "Single-use plastic packaging is still used across all food outlets",
      "Halal and vegan options are limited to a single counter",
      "Food waste bins are not clearly labelled, reducing recycling rates",
      "The microwave facilities in the student common room are outdated",
      "Campus water fountains are too few and often out of service",
      "International students find it difficult to source familiar ingredients nearby",
    ],
    suggestions: [
      "Introduce a pre-order mobile app to reduce canteen queue times",
      "Expand the plant-based and vegan menu across all outlets",
      "Offer a subsidised hot meal deal for students on financial support",
      "Extend catering hours to cover evening lecture slots",
      "Replace single-use packaging with reusable container deposit schemes",
      "Label allergen information clearly on every item in every outlet",
      "Install additional filtered water stations across campus",
      "Set up a food bank or free shelf for surplus meals at the end of service",
      "Introduce a community fridge initiative to reduce daily food waste",
      "Partner with local farms for a weekly affordable fresh produce market",
    ],
  },
  digital: {
    challenges: [
      "Wi-Fi drops out regularly in older lecture halls during live sessions",
      "Software licences are not available to students working off-campus",
      "There is no laptop loan scheme for students who cannot afford a device",
      "VPN access expires over summer, cutting off library resources",
      "Recorded lectures are taken down after two weeks, limiting revision",
      "The virtual learning environment is slow and not mobile-friendly",
      "Digital skills training is only available in the first week of term",
      "Students without reliable broadband at home are disadvantaged in assessments",
      "Accessibility features in course materials are inconsistently applied",
      "File upload size limits on assignment portals are too restrictive",
    ],
    suggestions: [
      "Create a student device lending library for short-term borrowing",
      "Extend VPN and software access for the full duration of enrolment",
      "Keep lecture recordings available until after the exam period ends",
      "Upgrade Wi-Fi infrastructure in high-traffic teaching rooms",
      "Provide free access to industry-standard software suites",
      "Redesign the virtual learning environment for mobile responsiveness",
      "Run digital skills drop-in sessions throughout the academic year",
      "Offer data SIM loans for students without adequate home broadband",
      "Mandate accessible PDF formats and captions for all course materials",
      "Increase assignment upload limits to accommodate large multimedia files",
    ],
  },
  union: {
    challenges: [
      "Common room spaces are overcrowded and noisy during peak hours",
      "The student union building has limited wheelchair accessibility on upper floors",
      "Event spaces are expensive to hire for smaller student society events",
      "There is no dedicated quiet study zone in the student union building",
      "The union cafe offers poor value for money compared to local options",
      "Sports facilities close too early on weekday evenings for working students",
      "Arts and creative spaces are prioritised for paid external bookings over students",
      "Mentoring and peer support programmes lack visibility and promotion",
      "The union website is difficult to navigate and infrequently updated",
      "Student society budgets have been reduced without transparent justification",
    ],
    suggestions: [
      "Create a bookable quiet study pod section in the student union",
      "Install a ramp and accessible lift to all floors of the union building",
      "Subsidise event room hire for registered student societies",
      "Open sports facilities until 10 pm on weekday evenings",
      "Launch a dedicated peer mentoring hub with a full-time coordinator",
      "Redesign the union website with a clear events and services calendar",
      "Establish a transparent annual budget report for all student societies",
      "Introduce a maker space with 3D printing and creative design tools",
      "Reinstate the subsidised hot drinks scheme for studying students",
      "Create a dedicated international student lounge to support community building",
    ],
  },
};

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

// Tracks which consultation IDs have already been auto-seeded this process
const attemptedConsultationIds = new Set<string>();

function isDemoSeedEnabled(): boolean {
  const configuredValue = process.env[ENABLE_DEMO_SEED_FLAG];

  if (configuredValue === undefined) {
    return true;
  }

  const normalizedValue = configuredValue.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalizedValue);
}

function getContentForConsultation(consultationId: string): ConsultationContent {
  const id = consultationId.toLowerCase();
  if (id.includes("transport")) return contentByTopic["transport"];
  if (id.includes("food")) return contentByTopic["food"];
  if (id.includes("digital")) return contentByTopic["digital"];
  if (id.includes("union")) return contentByTopic["union"];
  return contentByTopic["wellbeing"];
}

function buildSyntheticResponses(
  consultationId: string,
  responseCount: number,
): Omit<ConsultationResponse, "id" | "createdAt">[] {
  const now = Date.now();
  const content = getContentForConsultation(consultationId);

  return Array.from({ length: responseCount }, (_, index) => {
    const profile = seedProfiles[index % seedProfiles.length];
    const challenge = content.challenges[index % content.challenges.length];
    const suggestion = content.suggestions[(index * 2) % content.suggestions.length];
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

function seedConsultation(
  consultationId: string,
  minimumResponses: number,
): DemoSeedResult {
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

export function ensureDemoResponsesSeeded(
  options: EnsureDemoSeedOptions = {},
): DemoSeedResult[] {
  const minimumResponses =
    options.minimumResponses ?? DEFAULT_MINIMUM_RESPONSES;

  if (!options.force && process.env.NODE_ENV !== "development") {
    return [
      {
        seeded: false,
        reason: "non_development_environment",
        existingCount: 0,
        addedCount: 0,
        totalCount: 0,
      },
    ];
  }

  if (!options.force && !isDemoSeedEnabled()) {
    return [
      {
        seeded: false,
        reason: "disabled_by_flag",
        existingCount: 0,
        addedCount: 0,
        totalCount: 0,
      },
    ];
  }

  const consultationIds = options.consultationId
    ? [options.consultationId]
    : listConsultations().map((c) => c.id);

  if (consultationIds.length === 0) {
    return [
      {
        seeded: false,
        reason: "no_consultation",
        existingCount: 0,
        addedCount: 0,
        totalCount: 0,
      },
    ];
  }

  const results: DemoSeedResult[] = [];

  for (const cid of consultationIds) {
    if (!options.force && attemptedConsultationIds.has(cid)) {
      continue;
    }

    if (!options.force) {
      attemptedConsultationIds.add(cid);
    }

    results.push(seedConsultation(cid, minimumResponses));
  }

  return results;
}
