## Step 1 — Inventory All Features Across All Inputs

Before writing, consolidate every distinct feature mentioned across all three sources:

**From Idea 6 (original):** QR/form-based input, nickname + age band, AI theme clustering, dual-audience reports (adult + youth), bar charts per theme, consent framework.

**From Bias Radar:** Participation counts by group, theme-level demographic breakdown, underrepresentation alerts, AI-generated equity narrative, limitation disclosures, no individual profiling.

**From CivicLens draft:** Modular architecture, anonymised quotes, feedback loop to participants, technical stack, ethical framework table, "what's next" roadmap.

**From the new summary:** QR-based micro-polls (no registration), Decision Impact Simulator, conflicting viewpoint detection, Missing Voices engine, sentiment evolution over time, closed-loop notifications when input leads to real decisions.

---
## Final Comprehensive Project Description

---

# CivicLens: Youth Voice Aggregator

### *From student input to measurable, equitable, traceable impact*

---

## The Problem

Young people — university students and school pupils — are the demographic most directly affected by decisions made in institutions and local councils, yet they are the least represented in formal consultation processes. The structural barriers are well-documented:

- Participation tools require registration, installation, or scheduled attendance
- Open-ended responses are rarely processed at scale; most go unread
- AI-assisted aggregation tools amplify whoever responds loudest, not who matters most
- Feedback loops are absent: students almost never learn whether their input led to anything

The result is predictable: disengagement, cynicism, and a widening gap between the people making decisions and the people living with them.

CivicLens is built to close that gap — not by collecting more voices, but by doing something meaningful with every voice collected.

---

## Who This Affects

- **Students (12–25)** at schools, universities, and youth councils who want structured channels to raise concerns about issues that affect their daily lives: campus facilities, mental health support, local transport, sustainability, education policy
- **Student union officers and youth councillors** who need credible, representative evidence to take to decision-makers
- **Teachers, administrators, and local council members** who must make policy decisions and lack the time or capacity to process open-ended feedback at scale
- **Civic participation researchers and governance advocates** working on AI transparency and democratic inclusion

---

## What CivicLens Does

CivicLens is a lightweight web platform that turns student feedback into structured, equitable, and actionable intelligence — across four stages.

---

### Stage 1 — Collect: Frictionless, Inclusive Participation

**QR-Based Micro-Polls**
Students access a consultation in seconds by scanning a QR code — no account creation, no app download, no login. A single URL renders a mobile-optimised form with:

- An issue-specific open question set by the organiser (e.g., *"What changes would most improve mental health support at this school?"*)
- Optional nickname (no real names)
- Age band (e.g., 16–17, 18–21, 22–25)
- Self-described group (optional: e.g., commuter student, disability status, year of study, area of campus)
- Estimated completion time: under 90 seconds

**Consent by Design**
Every form opens with a plain-English consent statement explaining what is collected, how it will be used, who will see it, and how long it will be retained. For under-16 participants, the framework requires school or parental authority sign-off before deployment. No personally identifiable information is collected at any point.

---

### Stage 2 — Analyse: AI-Powered, Equity-Aware Intelligence

Raw responses feed into a multi-layer analysis pipeline.

**AI Theme Clustering**
An LLM processes all responses and groups them into thematic clusters (e.g., *Workload & Deadlines*, *Physical Environment*, *Social Inclusion*, *Transport Access*). Each cluster is labelled, sized by response volume, and ranked by frequency.

**Dual-Audience Report Generation**
The same underlying data is translated into two distinct outputs:

- **Student-Facing Summary:** Plain, direct language. Tells participants what their peers said, what the dominant themes were, and how the conversation broke down. Designed to be shared back immediately. Includes anonymised representative quotes per theme.
- **Council-Ready Briefing:** Structured, procedural language suitable for a staff meeting, board paper, or local authority submission. Includes theme titles, response volumes, representative quotes, identified trade-offs, and suggested next steps.

**Conflicting Viewpoint Detection**
CivicLens identifies where the student body is genuinely divided — not just where there is a majority view. For example, if responses on *canteen pricing* split between *"lower prices, even if quality drops"* and *"maintain quality, charge fairly"*, this tension is surfaced explicitly in both reports. Decision-makers see real trade-offs, not false consensus.

**Missing Voices Engine (Bias Radar)**
This is the ethical backbone of the platform. After every consultation round, an automated representation audit runs:

- **Participation counts by group:** Who responded, broken down by age band and self-described group
- **Theme-level representation:** For each AI-generated theme, what share of contributors came from each group? If one theme is dominated by a single demographic, it is flagged
- **Underrepresentation alerts:** Groups present in the institution but absent or underrepresented in the response set are identified
- **AI equity narrative:** A short, carefully worded plain-English explanation — e.g., *"Students aged 16–17 represent 40% of the school population but only 11% of responses in the 'outdoor spaces' theme. Consider targeted outreach to this group before acting on findings in this area."*
- **Limitation disclosures:** The tool explicitly states sample size, voluntary participation bias, and the recommended minimum threshold of responses before findings should be acted upon

The Missing Voices Engine operates only on anonymised, aggregated group-level data. Individual responses cannot be linked to demographic tags under any circumstance.

---

### Stage 3 — Act: From Insight to Decision Support

**Decision Impact Simulator**
This is CivicLens's core innovation beyond standard feedback tools. Once themes and group data are established, organisers can model proposed actions before committing to them.

The simulator works as follows:
- The organiser inputs a proposed decision (e.g., *"Reduce canteen operating hours to cut costs"* or *"Introduce a new quiet study zone on the third floor"*)
- The system analyses which themes the decision addresses, which it does not, and which it may negatively affect
- It generates a projected sentiment impact across demographic groups — e.g., *"This action addresses the top concern for 22–25-year-olds but does not address the primary concern of 16–18-year-olds, who prioritised outdoor space"*
- Trade-off framing is included: the output highlights what is being gained and what is being deprioritised, rather than presenting any action as universally positive

This shifts CivicLens from a passive listening tool to an active decision-support system. Decision-makers go into policy conversations with a structured view of consequences, not just a list of complaints.

---

### Stage 4 — Close the Loop: Trust Through Transparency

Most consultation tools end at the report. CivicLens does not.

**Outcome Notifications**
When an organiser marks a decision as taken — whether in response to the consultation or not — students who participated receive a notification (via the same QR/URL channel, or via the institution's existing communication platform). The notification states:

- What the consultation asked
- What the main findings were
- What decision was made
- Whether and how student input influenced it

If input was not acted on, the notification explains why, with the organiser's stated reasoning.

**Sentiment Evolution Timeline**
Organisers can run the same question or topic across multiple time periods. CivicLens tracks how theme distribution and group representation shift between rounds — showing whether concerns are being resolved, whether new issues are emerging, and whether previously underrepresented groups are now participating more.

This is displayed as a timeline view in the dashboard, giving both students and decision-makers a longitudinal view of institutional responsiveness.

---

## Technical Architecture

```
[QR Code / URL Entry Point]
         |
         v
[Input Form — mobile-optimised, no auth required]
         |
         v
[Response Store — lightweight JSON / in-memory for demo]
         |
         +──> [AI Theme Clustering — Claude API]
         |              |
         |              +──> Student Summary (plain language)
         |              +──> Council Briefing (structured)
         |              +──> Conflicting Viewpoint Detection
         |
         +──> [Missing Voices Engine]
         |              |
         |              +──> Group participation counts
         |              +──> Theme-level demographic breakdown
         |              +──> Underrepresentation alerts
         |              +──> AI equity narrative (Claude API)
         |
         +──> [Decision Impact Simulator]
                        |
                        +──> Proposed action input (organiser)
                        +──> Projected sentiment impact by group
                        +──> Trade-off framing output (Claude API)

[Dashboard — Charts, reports, simulator, timeline]
[Outcome Notification — closes the loop to participants]
```

**Stack**

| Layer | Technology |
|---|---|
| Frontend | Next.js (or single-page HTML/CSS/JS for demo) |
| AI layer | Anthropic Claude API — claude-sonnet-4 |
| Data store | In-memory / flat JSON (demo); PostgreSQL for production |
| Charts | Chart.js or Recharts |
| QR generation | qrcode.js (client-side, no dependency) |
| Deployment | Vercel (demo) |

**Demo Dataset**
Pre-seeded with 50–60 synthetic responses across age bands and self-described groups to demonstrate the Missing Voices Engine and Decision Impact Simulator meaningfully, alongside a live QR input path for judges to add real responses during the presentation.

---

## Ethical Framework

Ethics in CivicLens is structural, not decorative.

| Concern | How CivicLens Addresses It |
|---|---|
| Data minimisation | No names, emails, or device identifiers collected at any point |
| Informed consent | Plain-English consent prompt on every form; purpose and retention period stated clearly |
| Under-16 safeguarding | Parental or school authority consent required before deployment; no PII collected |
| AI replacing human judgement | All AI outputs are labelled as AI-assisted; every report prompts human review before action |
| Amplifying majority voices | Missing Voices Engine flags theme-level dominance before output is acted on |
| Individual profiling | Group data is only shown in aggregate; demographic tags cannot be linked to individual responses |
| Small sample bias | System discloses sample size on all outputs and warns when below a minimum reliable threshold |
| Transparency of AI limits | All AI-generated narratives include a confidence caveat and encourage organiser verification |
| Accountability | Decision Impact Simulator outputs are not prescriptive — they are framed as *considerations*, not recommendations |

**Core design principle:** CivicLens augments human deliberation. Every AI output is a prompt for human conversation, not a substitute for it.

---

## What We Would Build Next

- **Exportable PDF reports** formatted for formal submission to local authorities or school boards
- **Organiser authentication** without requiring it for participants
- **Integration with existing institution platforms** (e.g., Moodle, Microsoft Teams, Google Classroom) for notification delivery
- **Longitudinal sentiment tracking** across academic terms or council cycles
- **Accessibility enhancements:** full screen-reader compliance, reading-age optimisation, multilingual support
- **Pilot programme with a real youth council or student union** to validate the consent model and refine the Missing Voices thresholds
- **Open-source the Missing Voices Engine** as a standalone module available to other civic tech platforms

---

## Summary

Student voices are currently collected and forgotten. CivicLens changes this across every stage of the process: removing barriers to participation, ensuring the responses collected actually represent the community, surfacing real trade-offs rather than false consensus, supporting decisions with impact modelling, and — critically — telling students what happened because of what they said.

This is not a polling tool. It is a democratic participation system designed around the question every consultation should answer but almost never does:

**Did it matter that I spoke?**

With CivicLens, the answer is always visible.
