Folder Structure

```sh
Voxify/
│
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── page.tsx                  # Landing page
│   │
│   ├── poll/
│   │   └── [id]/
│   │       └── page.tsx          # Student-facing input form (QR destination)
│   │
│   ├── dashboard/
│   │   └── page.tsx              # Organiser dashboard (themes, charts, reports)
│   │
│   ├── simulator/
│   │   └── page.tsx              # Decision Impact Simulator
│   │
│   ├── outcome/
│   │   └── [id]/
│   │       └── page.tsx          # Closed-loop: student outcome notification view
│   │
│   └── api/                      # Next.js API route handlers (server-side only)
│       ├── responses/
│       │   └── route.ts          # POST: save a student response
│       ├── analyse/
│       │   └── route.ts          # POST: trigger Claude theme clustering + reports
│       ├── bias/
│       │   └── route.ts          # POST: run Missing Voices Engine + equity narrative
│       └── simulate/
│           └── route.ts          # POST: run Decision Impact Simulator via Claude
│
├── components/                   # Reusable UI components
│   ├── PollForm.tsx              # Student input form
│   ├── ThemeChart.tsx            # Bar chart: responses per theme
│   ├── RepresentationChart.tsx   # Chart: group participation breakdown
│   ├── MissingVoicesAlert.tsx    # Underrepresentation flag + equity narrative
│   ├── DualReport.tsx            # Student summary + council briefing side-by-side
│   ├── SimulatorInput.tsx        # Organiser inputs proposed action
│   ├── SimulatorOutput.tsx       # Projected impact + trade-off framing
│   ├── SentimentTimeline.tsx     # Longitudinal sentiment view
│   └── ConsentBanner.tsx         # Plain-English consent prompt
│
├── lib/                          # Server-side logic (never imported by client)
│   ├── ai.ts                     # Anthropic client wrapper and orchestration helpers
│   ├── analyse.ts                # Theme clustering + dual-report generation logic
│   ├── bias.ts                   # Missing Voices Engine logic
│   ├── simulator.ts              # Decision Impact Simulator logic
│   ├── store.ts                  # Read/write helpers for poll/survey JSON storage
│   └── prompts.ts                # TXT prompt template loader for AI calls
│
├── data/                         # Flat JSON files consumed by app + AI layer
│   ├── polls.json                # Poll definitions and question metadata
│   ├── surveys.json              # Submitted survey responses
│   ├── decisions.json            # Decision proposals from organisers
│   └── outcomes.json             # Final decisions + close-loop explanations
│
├── prompts/                      # AI prompt templates in plain TXT files
│   ├── theme-clustering.txt
│   ├── dual-reports.txt
│   ├── conflicting-viewpoints.txt
│   ├── equity-narrative.txt
│   └── decision-impact.txt
│
├── types/                        # Shared TypeScript type definitions
│   └── index.ts                  # Response, Poll, Theme, GroupStats, SimResult, etc.
│
├── public/                       # Static assets
│   └── qr/                       # Pre-generated QR code images per poll
│
├── .env.local                    # ANTHROPIC_API_KEY (never committed)
├── .gitignore
├── next.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Demo seeding mode

- In development, Voxify auto-seeds synthetic survey responses on the first request.
- Auto-seeding runs only when fewer than 56 responses exist for the first consultation.
- To disable auto-seeding, set `VOXIFY_ENABLE_DEMO_SEED=false` in `.env.local`.
- To trigger manual seeding while `npm run dev` is running, use:

```sh
npm run seed:demo
```

- Manual seeding calls `POST /api/dev/seed` and is available in development only.
