import { NextResponse } from "next/server";

import { getConsultation, setOutcome } from "@/lib/store";

type OutcomeRouteContext = {
  params: Promise<{ id: string }>;
};

type OutcomePayload = {
  decisionTitle?: unknown;
  decisionDescription?: unknown;
  influencedByInput?: unknown;
  organiserExplanation?: unknown;
};

export async function POST(
  request: Request,
  context: OutcomeRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    return NextResponse.json(
      { error: "Consultation not found." },
      { status: 404 },
    );
  }

  let payload: OutcomePayload;
  try {
    payload = (await request.json()) as OutcomePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof payload.decisionTitle !== "string" ||
    payload.decisionTitle.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "decisionTitle is required." },
      { status: 400 },
    );
  }

  if (
    typeof payload.decisionDescription !== "string" ||
    payload.decisionDescription.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "decisionDescription is required." },
      { status: 400 },
    );
  }

  if (
    typeof payload.organiserExplanation !== "string" ||
    payload.organiserExplanation.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "organiserExplanation is required." },
      { status: 400 },
    );
  }

  if (typeof payload.influencedByInput !== "boolean") {
    return NextResponse.json(
      { error: "influencedByInput must be a boolean." },
      { status: 400 },
    );
  }

  const savedOutcome = setOutcome({
    consultationId: id,
    decisionTitle: payload.decisionTitle.trim(),
    decisionDescription: payload.decisionDescription.trim(),
    influencedByInput: payload.influencedByInput,
    organiserExplanation: payload.organiserExplanation.trim(),
  });

  return NextResponse.json({
    success: true,
    outcome: savedOutcome,
  });
}
