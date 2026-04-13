<a id="readme-top"></a>

<br />
<div style="text-align: center;">

<a href="https://github.com/Adwerse/Voxify">
<img src="public/vote.png" alt="Voxify Logo" width="140" height="140">
</a>

<h3>Voxify</h3>

<p>
A lightweight platform that turns student feedback into structured,
equitable, and actionable intelligence across four stages:
Collect → Analyse → Act → Close the Loop.
<br><br>
<a href="https://github.com/Adwerse/Voxify"><strong>Explore the repository »</strong></a>
<br><br>
<a href="https://github.com/Adwerse/Voxify/issues/new?labels=bug">Report Bug</a>
·
<a href="https://github.com/Adwerse/Voxify/issues/new?labels=enhancement">Request Feature</a>
</p>

</div>

<details>
	<summary>Table of Contents</summary>
	<ol>
		<li>
			<a href="#about-the-project">About The Project</a>
			<ul>
				<li><a href="#built-with">Built With</a></li>
				<li><a href="#core-workflow">Core Workflow</a></li>
			</ul>
		</li>
		<li>
			<a href="#getting-started">Getting Started</a>
			<ul>
				<li><a href="#prerequisites">Prerequisites</a></li>
				<li><a href="#installation">Installation</a></li>
				<li><a href="#environment-variables">Environment Variables</a></li>
			</ul>
		</li>
		<li><a href="#project-structure">Project Structure</a></li>
		<li>
			<a href="#api-surface">API Surface</a>
			<ul>
				<li><a href="#consultations-and-intake">Consultations and Intake</a></li>
				<li><a href="#analysis-and-simulation">Analysis and Simulation</a></li>
			</ul>
		</li>
		<li><a href="#usage">Usage</a></li>
		<li><a href="#step-by-step-development-workflow">Step-by-Step Development Workflow</a></li>
		<li><a href="#data-model-summary">Data Model Summary</a></li>
		<li><a href="#security--ethics-constraints">Security & Ethics Constraints</a></li>
		<li><a href="#quality-checks">Quality Checks</a></li>
		<li><a href="#deployment-notes">Deployment Notes</a></li>
		<li><a href="#roadmap">Roadmap</a></li>
		<li><a href="#contributing">Contributing</a></li>
		<li><a href="#license">License</a></li>
		<li><a href="#contact">Contact</a></li>
		<li><a href="#acknowledgments">Acknowledgments</a></li>
	</ol>
</details>

## About The Project

Voxify is a Next.js App for student consultation workflows.
It captures feedback quickly, analyzes themes and representation, supports
organizer decision simulation, and publishes transparent outcomes.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

- [Next.js 16.2.1](https://nextjs.org/docs)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Anthropic TypeScript SDK](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [Chart.js](https://www.chartjs.org/) + [react-chartjs-2](https://react-chartjs-2.js.org/)
- [Bootstrap 5](https://getbootstrap.com/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Core Workflow

1. **Collect**
   - Students open a consultation page, review consent, and submit a response.
2. **Analyse**
   - Organizers run AI-assisted analysis to generate themes, dual reports,
     conflicts, and representation insights.
3. **Act**
   - Organizers create decision proposals and run impact simulation.
4. **Close the Loop**
   - Organizers publish outcomes that explain what changed and why.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- **Node.js**: 20+
- **npm**: 10+
- **Anthropic API key**: Required for AI analysis and simulation

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Adwerse/Voxify.git
cd Voxify
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local`:

```bash
cp .env.local.example .env.local
```

If you do not have `.env.local.example`, create `.env.local` manually.

4. Set required environment variables (see below).

5. Start development server:

```bash
npm run dev
```

6. Open:

```text
http://localhost:3000
```

### Environment Variables

Add these values to `.env.local`:

```bash
ANTHROPIC_API_KEY=your_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MAX_TOKENS=2048
VOXIFY_ENABLE_DEMO_SEED=true
VOXIFY_BASE_URL=http://localhost:3000
```

Notes:

- `ANTHROPIC_MODEL` and `ANTHROPIC_MAX_TOKENS` are optional overrides.
- `VOXIFY_ENABLE_DEMO_SEED=false` disables automatic demo seeding.
- `VOXIFY_BASE_URL` is used by `npm run seed:demo`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Project Structure

```text
Voxify/
├── app/
│   ├── api/
│   │   ├── consultations/[id]/
│   │   │   ├── route.ts
│   │   │   ├── analyse/route.ts
│   │   │   ├── decisions/route.ts
│   │   │   ├── simulate/route.ts
│   │   │   └── outcome/route.ts
│   │   ├── dev/seed/route.ts
│   │   └── responses/route.ts
│   ├── consultation/[id]/...
│   └── organiser/consultations/[id]/...
├── components/
├── data/
├── lib/
├── prompts/
├── scripts/
├── types/
└── README.md
```

Key boundaries:

- `app/api/*`: validation + orchestration only
- `lib/*`: business logic, storage, AI integration
- `components/*`: rendering-only UI units
- `types/*`: shared contracts reused across server and client

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## API Surface

### Consultations and Intake

| Method | Route                     | Purpose                                                                                 |
| ------ | ------------------------- | --------------------------------------------------------------------------------------- |
| `GET`  | `/api/consultations/[id]` | Returns consultation details and stats (`responseCount`, `proposalCount`, `hasOutcome`) |
| `POST` | `/api/responses`          | Validates and stores a student response                                                 |
| `POST` | `/api/dev/seed`           | Seeds synthetic data in development mode                                                |

### Analysis and Simulation

| Method | Route                               | Purpose                                                                                   |
| ------ | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `POST` | `/api/consultations/[id]/analyse`   | Runs theme clustering, representation stats, dual reports, conflicts, and caches analysis |
| `POST` | `/api/consultations/[id]/decisions` | Creates a decision proposal                                                               |
| `POST` | `/api/consultations/[id]/simulate`  | Simulates impacts for saved decision proposals                                            |
| `POST` | `/api/consultations/[id]/outcome`   | Saves final organizer outcome narrative                                                   |

Important behavior:

- Analysis is persisted to `data/analysis.json`.
- Organizer analysis page reads cached analysis and is forced dynamic for
  freshness on reruns.
- Fallback analysis/report outputs are generated if model JSON cannot be parsed.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

### Student Flow

1. Open an active consultation from the home page.
2. Accept consent at `/consultation/[id]/consent`.
3. Submit answers at `/consultation/[id]/form`.
4. View acknowledgment at `/consultation/[id]/thanks`.
5. Later, view published result at `/consultation/[id]/outcome`.

### Organizer Flow

1. Open `/organiser`.
2. Run analysis from the consultation analysis page.
3. Review themes, dual reports, conflicts, and representation section.
4. Add proposals in simulator and run impact simulation.
5. Publish final outcome in outcome editor.

### Demo Data Seeding

Auto-seeding is enabled in development when response volume is low.

Manual seed:

```bash
npm run seed:demo
```

This executes `scripts/seed.sh`, which POSTs to `/api/dev/seed`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Data Model Summary

Primary entities:

- `Consultation`
- `Response`
- `Theme`
- `RepresentationStats`
- `UnderrepresentationAlert`
- `DecisionProposal`
- `DecisionImpactResult`
- `Outcome`

Storage files:

- `data/polls.json`
- `data/surveys.json`
- `data/decisions.json`
- `data/outcomes.json`
- `data/analysis.json`

Prompt templates:

- `prompts/theme-clustering.txt`
- `prompts/dual-reports.txt`
- `prompts/conflicting-viewpoints.txt`
- `prompts/equity-narrative.txt`
- `prompts/decision-impact.txt`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Contributions are welcome.

1. Fork the project.
2. Create your feature branch:

```bash
git checkout -b feature/amazing-change
```

3. Commit your changes using Conventional Commits:

```bash
git commit -m "feat(scope): add amazing change"
```

4. Push and open a pull request.

Please keep changes small, reversible, and aligned with the architecture
boundaries described in this README.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

Distributed under the Apache License 2.0.
See `LICENSE` for full text.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

- [@Adwerse](https://github.com/Adwerse)
- [@vijethph](https://github.com/vijethph)

Project Link: [https://github.com/Adwerse/Voxify](https://github.com/Adwerse/Voxify)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Acknowledgments

- [Best README Template by Othneil Drew](https://github.com/othneildrew/Best-README-Template)
- [Next.js Documentation](https://nextjs.org/docs)
- [Anthropic API Documentation](https://platform.claude.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [Bootstrap Documentation](https://getbootstrap.com/docs/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
