import { NextResponse } from "next/server";

import { ensureDemoResponsesSeeded } from "@/lib/demoSeed";

export async function POST(): Promise<Response> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Manual demo seeding is only available in development." },
      { status: 403 },
    );
  }

  const result = ensureDemoResponsesSeeded({ force: true });

  return NextResponse.json({
    success: true,
    result,
  });
}
