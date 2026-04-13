import { NextResponse } from "next/server";

import {
  getConsultation,
  getOutcome,
  listDecisions,
  listResponses,
} from "@/lib/store";

type ConsultationRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: ConsultationRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    return NextResponse.json(
      { error: "Consultation not found." },
      { status: 404 },
    );
  }

  const responseCount = listResponses(id).length;
  const proposalCount = listDecisions().length;
  const hasOutcome = Boolean(getOutcome(id));

  return NextResponse.json({
    consultation,
    stats: {
      responseCount,
      proposalCount,
      hasOutcome,
    },
  });
}
