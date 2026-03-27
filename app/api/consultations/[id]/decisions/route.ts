import { NextResponse } from "next/server";

import { addDecision, getConsultation } from "@/lib/store";

type DecisionsRouteContext = {
  params: Promise<{ id: string }>;
};

type DecisionPayload = {
  title?: unknown;
  description?: unknown;
};

export async function POST(
  request: Request,
  context: DecisionsRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    return NextResponse.json(
      { error: "Consultation not found." },
      { status: 404 },
    );
  }

  let payload: DecisionPayload;
  try {
    payload = (await request.json()) as DecisionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  if (
    typeof payload.description !== "string" ||
    payload.description.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "description is required." },
      { status: 400 },
    );
  }

  const decision = addDecision({
    title: payload.title.trim(),
    description: payload.description.trim(),
  });

  return NextResponse.json(
    {
      success: true,
      decision,
    },
    { status: 201 },
  );
}
