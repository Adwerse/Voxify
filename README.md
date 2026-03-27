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
│   ├── claude.ts                 # Anthropic client setup + shared prompt helpers
│   ├── analyse.ts                # Theme clustering + dual-report generation logic
│   ├── bias.ts                   # Missing Voices Engine logic
│   ├── simulator.ts              # Decision Impact Simulator logic
│   └── store.ts                  # Read/write helpers for flat JSON data store
│
├── data/                         # Flat JSON files (demo data store)
│   ├── polls.json                # Poll definitions (question, id, active status)
│   ├── responses.json            # All submitted student responses
│   └── outcomes.json             # Decisions made + outcome notifications
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
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```
