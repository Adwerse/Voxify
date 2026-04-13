import { NextResponse } from "next/server";

import { addResponse, getConsultation } from "@/lib/store";
import type { AgeBand, ParticipantMetadata } from "@/types";

const allowedAgeBands = new Set<AgeBand>(["16-17", "18-21", "22-25", "other"]);

type ResponsePayload = {
  consultationId?: unknown;
  answers?: unknown;
  meta?: unknown;
};

function isValidMeta(meta: unknown): meta is ParticipantMetadata {
  if (!meta || typeof meta !== "object") {
    return false;
  }

  const candidate = meta as Record<string, unknown>;

  const hasValidAgeBand =
    typeof candidate.ageBand === "string" &&
    allowedAgeBands.has(candidate.ageBand as AgeBand);

  const hasValidGroups =
    Array.isArray(candidate.groups) &&
    candidate.groups.every((group) => typeof group === "string");

  const hasValidNickname =
    candidate.nickname === undefined || typeof candidate.nickname === "string";

  return hasValidAgeBand && hasValidGroups && hasValidNickname;
}

function normalizeAnswers(answers: unknown): string[] {
  if (!Array.isArray(answers)) {
    return [];
  }

  return answers
    .filter((answer): answer is string => typeof answer === "string")
    .map((answer) => answer.trim())
    .filter((answer) => answer.length > 0);
}

export async function POST(request: Request): Promise<Response> {
  let payload: ResponsePayload;

  try {
    payload = (await request.json()) as ResponsePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof payload.consultationId !== "string" ||
    payload.consultationId.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "consultationId is required." },
      { status: 400 },
    );
  }

  const consultation = getConsultation(payload.consultationId);
  if (!consultation) {
    return NextResponse.json(
      { error: "Consultation not found." },
      { status: 404 },
    );
  }

  const answers = normalizeAnswers(payload.answers);
  if (answers.length === 0) {
    return NextResponse.json(
      { error: "answers must contain at least one non-empty string." },
      { status: 400 },
    );
  }

  if (!isValidMeta(payload.meta)) {
    return NextResponse.json(
      { error: "meta must include valid ageBand and groups." },
      { status: 400 },
    );
  }

  const createdResponse = addResponse({
    consultationId: consultation.id,
    answers,
    meta: {
      nickname: payload.meta.nickname?.trim() || undefined,
      ageBand: payload.meta.ageBand,
      groups: payload.meta.groups
        .map((group) => group.trim())
        .filter((group) => group.length > 0),
    },
  });

  return NextResponse.json(
    {
      success: true,
      response: createdResponse,
    },
    { status: 201 },
  );
}
