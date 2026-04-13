import { NextResponse } from "next/server";

import { simulateDecisionImpact } from "@/lib/ai";
import { getConsultationAnalysis } from "@/lib/analysis-store";
import { getConsultation, listDecisions } from "@/lib/store";

type SimulateRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: SimulateRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const consultation = getConsultation(id);

  if (!consultation) {
    return NextResponse.json(
      { error: "Consultation not found." },
      { status: 404 },
    );
  }

  const analysis = getConsultationAnalysis(id);
  if (!analysis) {
    return NextResponse.json(
      { error: "Analysis not found. Run analysis first." },
      { status: 400 },
    );
  }

  const proposals = listDecisions();
  if (proposals.length === 0) {
    return NextResponse.json(
      { error: "No decision proposals available." },
      { status: 400 },
    );
  }

  const results = await simulateDecisionImpact(
    proposals,
    analysis.themes,
    analysis.representationStats,
  );

  return NextResponse.json({
    success: true,
    simulation: {
      consultationId: id,
      generatedAt: new Date().toISOString(),
      results,
    },
  });
}
