import type {
  Consultation,
  DecisionProposal,
  Outcome,
  Response as ConsultationResponse,
} from "@/types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type NewResponseInput = Omit<ConsultationResponse, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

type NewDecisionInput = Omit<DecisionProposal, "id"> & {
  id?: string;
};

const dataDirectoryPath = join(process.cwd(), "data");
const pollsFilePath = join(dataDirectoryPath, "polls.json");
const surveysFilePath = join(dataDirectoryPath, "surveys.json");
const decisionsFilePath = join(dataDirectoryPath, "decisions.json");
const outcomesFilePath = join(dataDirectoryPath, "outcomes.json");

function ensureDataDirectory(): void {
  if (!existsSync(dataDirectoryPath)) {
    mkdirSync(dataDirectoryPath, { recursive: true });
  }
}

function ensureJsonFile<T>(filePath: string, fallback: T): void {
  ensureDataDirectory();

  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  ensureJsonFile(filePath, fallback);

  try {
    const fileContent = readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent) as T;
  } catch {
    writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataDirectory();
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function listConsultations(): Consultation[] {
  return readJsonFile<Consultation[]>(pollsFilePath, []);
}

export function getConsultation(id: string): Consultation | undefined {
  const consultations = listConsultations();
  return consultations.find((consultation) => consultation.id === id);
}

export function addResponse(response: NewResponseInput): ConsultationResponse {
  return addResponses([response])[0];
}

export function addResponses(
  newResponses: NewResponseInput[],
): ConsultationResponse[] {
  if (newResponses.length === 0) {
    return [];
  }

  const responses = readJsonFile<ConsultationResponse[]>(surveysFilePath, []);

  const createdResponses = newResponses.map((response) => ({
    ...response,
    id: response.id ?? crypto.randomUUID(),
    createdAt: response.createdAt ?? new Date().toISOString(),
  }));

  responses.push(...createdResponses);
  writeJsonFile(surveysFilePath, responses);
  return createdResponses;
}

export function listResponses(consultationId?: string): ConsultationResponse[] {
  const responses = readJsonFile<ConsultationResponse[]>(surveysFilePath, []);

  if (!consultationId) {
    return responses;
  }

  return responses.filter(
    (response) => response.consultationId === consultationId,
  );
}

export function addDecision(proposal: NewDecisionInput): DecisionProposal {
  const decisions = readJsonFile<DecisionProposal[]>(decisionsFilePath, []);

  const createdDecision: DecisionProposal = {
    ...proposal,
    id: proposal.id ?? crypto.randomUUID(),
  };

  decisions.push(createdDecision);
  writeJsonFile(decisionsFilePath, decisions);
  return createdDecision;
}

export function listDecisions(): DecisionProposal[] {
  return readJsonFile<DecisionProposal[]>(decisionsFilePath, []);
}

export function setOutcome(outcome: Outcome): Outcome {
  const outcomes = readJsonFile<Outcome[]>(outcomesFilePath, []);

  const existingIndex = outcomes.findIndex(
    (item) => item.consultationId === outcome.consultationId,
  );

  if (existingIndex >= 0) {
    outcomes[existingIndex] = outcome;
    writeJsonFile(outcomesFilePath, outcomes);
    return outcomes[existingIndex];
  }

  outcomes.push(outcome);
  writeJsonFile(outcomesFilePath, outcomes);
  return outcome;
}

export function getOutcome(consultationId: string): Outcome | undefined {
  const outcomes = readJsonFile<Outcome[]>(outcomesFilePath, []);
  return outcomes.find((outcome) => outcome.consultationId === consultationId);
}
