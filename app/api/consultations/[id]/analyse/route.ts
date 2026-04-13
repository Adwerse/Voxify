import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  clusterThemes,
  detectConflictingViewpoints,
  generateDualReports,
  generateEquityNarrative,
} from "@/lib/ai";
import {
  setConsultationAnalysis,
  type ConsultationAnalysis,
} from "@/lib/analysis-store";
import {
  buildRepresentationStats,
  buildUnderrepresentationAlerts,
} from "@/lib/analytics";
import { getConsultation, listResponses } from "@/lib/store";
import type { Response as ConsultationResponse } from "@/types";

type AnalyseRouteContext = {
  params: Promise<{ id: string }>;
};

function buildFallbackReports(responseCount: number): {
  studentSummary: string;
  organiserBriefing: string;
} {
  return {
    studentSummary: `We received ${responseCount} responses. This summary uses fallback mode due to a temporary AI response issue, so treat it as directional and not comprehensive.`,
    organiserBriefing: `Processed ${responseCount} responses using fallback mode after an AI response issue. Re-run analysis for refreshed narratives and continue to apply sampling caveats.`,
  };
}

function collectSampleQuotes(responses: ConsultationResponse[]): string[] {
  const quotes: string[] = [];

  for (const response of responses) {
    for (const answer of response.answers) {
      const value = answer.trim();
      if (!value) {
        continue;
      }

      quotes.push(value);
      if (quotes.length >= 8) {
        return quotes;
      }
    }
  }

  return quotes;
}

export async function POST(
  _request: Request,
  context: AnalyseRouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;
    const consultation = getConsultation(id);

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found." },
        { status: 404 },
      );
    }

    const responses = listResponses(id);
    if (responses.length === 0) {
      return NextResponse.json(
        { error: "No responses available for analysis." },
        { status: 400 },
      );
    }

    const themes = await clusterThemes(responses, {
      consultation,
      responseCount: responses.length,
    });
    const representationStats = buildRepresentationStats(responses, themes);
    const underrepresentationAlerts =
      buildUnderrepresentationAlerts(representationStats);
    const [equityNarrative, reports, conflicts] = await Promise.all([
      generateEquityNarrative(
        representationStats,
        underrepresentationAlerts,
      ).catch(
        () =>
          "Representation findings are currently in fallback mode due to a temporary AI response issue. Interpret this run with sample-size and representativeness caveats.",
      ),
      generateDualReports(
        themes,
        responses,
        representationStats,
        underrepresentationAlerts,
        collectSampleQuotes(responses),
      ).catch(() => buildFallbackReports(responses.length)),
      detectConflictingViewpoints(themes, responses).catch(() => []),
    ]);

    const analysis: ConsultationAnalysis = {
      consultationId: id,
      generatedAt: new Date().toISOString(),
      themes,
      representationStats,
      underrepresentationAlerts,
      equityNarrative,
      reports,
      conflicts,
    };

    setConsultationAnalysis(analysis);
    revalidatePath(`/organiser/consultations/${id}/analysis`);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("analysis route failed", error);
    return NextResponse.json(
      {
        error:
          "Unable to complete analysis in this run. Please retry. If this persists, check model output formatting.",
      },
      { status: 502 },
    );
  }
}
