import type {
  ConflictingViewpoint,
  RepresentationStats,
  Theme,
  UnderrepresentationAlert,
} from "@/types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ConsultationAnalysis {
  consultationId: string;
  generatedAt: string;
  themes: Theme[];
  representationStats: RepresentationStats;
  underrepresentationAlerts: UnderrepresentationAlert[];
  equityNarrative: string;
  reports: {
    studentSummary: string;
    organiserBriefing: string;
  };
  conflicts: ConflictingViewpoint[];
}

const dataDirectoryPath = join(process.cwd(), "data");
const analysesFilePath = join(dataDirectoryPath, "analysis.json");

function ensureDataDirectory(): void {
  if (!existsSync(dataDirectoryPath)) {
    mkdirSync(dataDirectoryPath, { recursive: true });
  }
}

function ensureAnalysisFile(): void {
  ensureDataDirectory();

  if (!existsSync(analysesFilePath)) {
    writeFileSync(analysesFilePath, "[]", "utf-8");
  }
}

function readAnalyses(): ConsultationAnalysis[] {
  ensureAnalysisFile();

  try {
    const content = readFileSync(analysesFilePath, "utf-8");
    const parsed = JSON.parse(content) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((analysis): analysis is ConsultationAnalysis =>
      Boolean(
        analysis &&
        typeof analysis === "object" &&
        typeof (analysis as { consultationId?: unknown }).consultationId ===
          "string",
      ),
    );
  } catch {
    writeFileSync(analysesFilePath, "[]", "utf-8");
    return [];
  }
}

function writeAnalyses(analyses: ConsultationAnalysis[]): void {
  ensureDataDirectory();
  writeFileSync(analysesFilePath, JSON.stringify(analyses, null, 2), "utf-8");
}

export function getConsultationAnalysis(
  consultationId: string,
): ConsultationAnalysis | undefined {
  const analyses = readAnalyses();
  return analyses.find(
    (analysis) => analysis.consultationId === consultationId,
  );
}

export function setConsultationAnalysis(
  analysis: ConsultationAnalysis,
): ConsultationAnalysis {
  const analyses = readAnalyses();
  const existingIndex = analyses.findIndex(
    (item) => item.consultationId === analysis.consultationId,
  );

  if (existingIndex >= 0) {
    analyses[existingIndex] = analysis;
  } else {
    analyses.push(analysis);
  }

  writeAnalyses(analyses);
  return analysis;
}
