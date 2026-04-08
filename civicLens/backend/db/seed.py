import os
import random
from copy import deepcopy
from uuid import uuid4

from sqlalchemy.orm import Session

from db.database import Analysis, Identity, Poll, Response, SessionLocal, User, init_db
from security import encrypt_pii, generate_emoji_identity, hash_identifier, normalize_email, normalize_student_id


AGE_BANDS = ["16-17", "18-21", "22-25", "25+"]


def _seed_demo_accounts(db: Session) -> dict[str, str]:
    demo_accounts = [
        {
            "key": "aisling",
            "name": "Aisling OConnell",
            "email": "aisling.oconnell@student.tcd.ie",
            "student_id": "TCD10010001",
            "cohort_year": "Year 1",
            "demo_group": "Trinity Hall",
        },
        {
            "key": "cian",
            "name": "Cian Murphy",
            "email": "cian.murphy@student.tcd.ie",
            "student_id": "TCD10010002",
            "cohort_year": "Year 2",
            "demo_group": "Commuter",
        },
        {
            "key": "nora",
            "name": "Nora Byrne",
            "email": "nora.byrne@student.tcd.ie",
            "student_id": "TCD10010003",
            "cohort_year": "Year 3",
            "demo_group": "International",
        },
        {
            "key": "liam",
            "name": "Liam Kavanagh",
            "email": "liam.kavanagh@student.tcd.ie",
            "student_id": "TCD10010004",
            "cohort_year": "Year 4",
            "demo_group": "STEM",
        },
        {
            "key": "sarah",
            "name": "Sarah Doyle",
            "email": "sarah.doyle@student.tcd.ie",
            "student_id": "TCD10010005",
            "cohort_year": "Postgrad",
            "demo_group": "Mature learner",
        },
        {
            "key": "declan",
            "name": "Declan Walsh",
            "email": "declan.walsh@student.tcd.ie",
            "student_id": "TCD10010006",
            "cohort_year": "Year 2",
            "demo_group": "Societies",
        },
        {
            "key": "priya",
            "name": "Priya Singh",
            "email": "priya.singh@student.tcd.ie",
            "student_id": "TCD10010007",
            "cohort_year": "Year 1",
            "demo_group": "Disability support",
        },
        {
            "key": "tom",
            "name": "Tom Byrne",
            "email": "tom.byrne@tcd.ie",
            "student_id": "TCD10010008",
            "cohort_year": "Postgrad",
            "demo_group": "Research student",
        },
        {
            "key": "ema",
            "name": "Ema Nolan",
            "email": "ema.nolan@student.tcd.ie",
            "student_id": "TCD10010009",
            "cohort_year": "Year 2",
            "demo_group": "First-generation",
        },
        {
            "key": "ronan",
            "name": "Ronan Clarke",
            "email": "ronan.clarke@student.tcd.ie",
            "student_id": "TCD10010010",
            "cohort_year": "Year 3",
            "demo_group": "Sports clubs",
        },
        {
            "key": "fatima",
            "name": "Fatima Noor",
            "email": "fatima.noor@student.tcd.ie",
            "student_id": "TCD10010011",
            "cohort_year": "Year 1",
            "demo_group": "International",
        },
        {
            "key": "hugo",
            "name": "Hugo Keane",
            "email": "hugo.keane@student.tcd.ie",
            "student_id": "TCD10010012",
            "cohort_year": "Year 4",
            "demo_group": "Part-time worker",
        },
        {
            "key": "eoin",
            "name": "Eoin Kelly",
            "email": "eoin.kelly@student.tcd.ie",
            "student_id": "TCD10010013",
            "cohort_year": "Foundation Year",
            "demo_group": "Access programme",
        },
    ]

    emoji_by_key: dict[str, str] = {}

    for account in demo_accounts:
        name = account["name"].strip()
        email = normalize_email(account["email"])
        student_id = normalize_student_id(account["student_id"])
        cohort_year = account["cohort_year"].strip()
        demo_group = account["demo_group"].strip()

        email_hash = hash_identifier(email)
        student_hash = hash_identifier(student_id)
        emoji_id = generate_emoji_identity(student_id)

        identity = db.query(Identity).filter(Identity.emoji_id == emoji_id).first()
        if not identity:
            identity = Identity(
                emoji_id=emoji_id,
                verified=True,
                cohort_year=cohort_year,
                demo_group=demo_group,
            )
        else:
            identity.verified = True
            identity.cohort_year = cohort_year
            identity.demo_group = demo_group
        db.add(identity)
        db.flush()

        user = db.query(User).filter(User.student_hash == student_hash).first()
        if not user:
            user = User(
                email_hash=email_hash,
                student_hash=student_hash,
                name_encrypted=encrypt_pii(name),
                email_encrypted=encrypt_pii(email),
                student_id_encrypted=encrypt_pii(student_id),
                identity_emoji_id=emoji_id,
            )
        else:
            user.email_hash = email_hash
            user.name_encrypted = encrypt_pii(name)
            user.email_encrypted = encrypt_pii(email)
            user.student_id_encrypted = encrypt_pii(student_id)
            user.identity_emoji_id = emoji_id
        db.add(user)

        emoji_by_key[account["key"]] = emoji_id

    return emoji_by_key


def _demo_rng() -> random.Random:
    rng = random.Random()
    configured_seed = (os.getenv("DEMO_RANDOM_SEED", "") or "").strip()

    if configured_seed:
        try:
            rng.seed(int(configured_seed))
        except ValueError:
            rng.seed(configured_seed)

    return rng


def _noise_suffixes() -> list[str]:
    return [
        "This keeps coming up in student conversations.",
        "This would be a visible win this semester.",
        "Please prioritize this before finals.",
        "It affects both wellbeing and academic performance.",
        "This is especially difficult for commuters.",
        "A small pilot could prove impact quickly.",
        "This matters across year groups, not just first years.",
        "If solved, trust in student consultation would improve a lot.",
        "We would notice this change immediately.",
        "Please publish progress transparently if this moves forward.",
    ]


def _build_theme_payload(
    sample: dict,
    generated: list[dict[str, str]],
    total_responses: int,
) -> list[dict]:
    template_themes = sample.get("themes", {}).get("themes", [])
    theme_map = {
        item.get("id", ""): {
            "id": item.get("id", ""),
            "label": item.get("label", "Theme"),
            "response_count": 0,
            "percentage": 0.0,
            "representative_quotes": [],
            "age_band_breakdown": {band: 0 for band in AGE_BANDS},
        }
        for item in template_themes
        if isinstance(item, dict) and item.get("id")
    }

    for item in generated:
        theme_id = item["theme_id"]
        payload = theme_map.get(theme_id)
        if not payload:
            continue

        payload["response_count"] += 1
        age_band = item["age_band"]
        if age_band in payload["age_band_breakdown"]:
            payload["age_band_breakdown"][age_band] += 1

        quotes = payload["representative_quotes"]
        if len(quotes) < 2 and item["response_text"] not in quotes:
            quotes.append(item["response_text"])

    for payload in theme_map.values():
        payload["percentage"] = round((payload["response_count"] / max(total_responses, 1)) * 100, 2)

    return sorted(theme_map.values(), key=lambda record: record["response_count"], reverse=True)


def _build_missing_voices_payload(
    institution_demographics: dict[str, int],
    generated: list[dict[str, str]],
    top_theme_labels: list[str],
) -> dict:
    age_counts = {band: 0 for band in AGE_BANDS}
    for item in generated:
        if item["age_band"] in age_counts:
            age_counts[item["age_band"]] += 1

    total = max(sum(age_counts.values()), 1)
    underrepresented = []

    for band, institution_share in institution_demographics.items():
        response_share = round((age_counts.get(band, 0) / total) * 100, 2)
        gap = round(float(institution_share) - response_share, 2)
        if gap > 15:
            underrepresented.append(
                {
                    "group": band,
                    "institution_share": round(float(institution_share), 2),
                    "response_share": response_share,
                    "gap": gap,
                    "affected_themes": top_theme_labels[:2] if top_theme_labels else ["General student priorities"],
                    "equity_note": f"{band} students are meaningfully underrepresented in this consultation wave.",
                }
            )

    if not underrepresented:
        representation_health = "good"
        recommendation = "Representation is currently balanced against the configured baseline demographics."
    elif len(underrepresented) == 1:
        representation_health = "moderate"
        recommendation = "Run one targeted outreach push for the identified underrepresented cohort."
    else:
        representation_health = "poor"
        recommendation = "Run focused outreach across multiple underrepresented cohorts before final policy decisions."

    return {
        "underrepresented_groups": underrepresented,
        "representation_health": representation_health,
        "recommendation": recommendation,
    }


def _generate_poll_responses(
    sample: dict,
    emoji_by_key: dict[str, str],
    rng: random.Random,
    target_count: int,
) -> tuple[list[dict[str, str]], list[dict], dict]:
    templates = sample.get("responses", [])
    suffixes = _noise_suffixes()
    generated: list[dict[str, str]] = []

    while len(generated) < target_count:
        account_key, age_band, group_tag, base_text, theme_id = rng.choice(templates)
        emoji_id = emoji_by_key.get(account_key)
        if not emoji_id:
            continue

        response_text = base_text
        if rng.random() < 0.55:
            response_text = f"{base_text} {rng.choice(suffixes)}"

        generated.append(
            {
                "emoji_id": emoji_id,
                "age_band": age_band,
                "group_tag": group_tag,
                "response_text": response_text,
                "theme_id": theme_id,
            }
        )

    themes = _build_theme_payload(sample=sample, generated=generated, total_responses=target_count)
    top_theme_labels = [item.get("label", "") for item in themes if item.get("label")]
    missing_voices = _build_missing_voices_payload(
        institution_demographics=sample.get("institution_demographics", {}),
        generated=generated,
        top_theme_labels=top_theme_labels,
    )

    return generated, themes, missing_voices


def _poll_samples() -> list[dict]:
    return [
        {
            "id": "tcd-001",
            "title": "Berkeley Late Access and Study Equity",
            "question": "What should Trinity prioritize this month to make exam study fairer across campus?",
            "organisation": "Trinity College Dublin Students Union",
            "mode": "standard",
            "institution_demographics": {"16-17": 4, "18-21": 68, "22-25": 20, "25+": 8},
            "responses": [
                ("aisling", "18-21", "trinity_hall", "Keep Berkeley open until 1am during exam weeks.", "theme_1"),
                ("cian", "18-21", "commuter", "If library closes at 10pm I lose two study hours after my commute.", "theme_3"),
                ("nora", "22-25", "international", "Reserve more silent seats near sockets, they are full by noon.", "theme_2"),
                ("liam", "22-25", "stem", "I need late spaces for coding and report writing before lab deadlines.", "theme_1"),
                ("sarah", "25+", "mature_learner", "Quiet zones should be monitored because noise rises after 8pm.", "theme_2"),
                ("priya", "18-21", "disability_support", "Priority seating for accessibility needs should be clearly marked.", "theme_2"),
                ("ema", "18-21", "first_generation", "Longer hours matter, but safe routes home matter just as much.", "theme_3"),
                ("hugo", "22-25", "part_time_worker", "After work shifts I only get meaningful study time after 9pm.", "theme_1"),
            ],
            "themes": {
                "themes": [
                    {
                        "id": "theme_1",
                        "label": "Late library hours",
                        "response_count": 4,
                        "percentage": 50.0,
                        "representative_quotes": [
                            "Keep Berkeley open until 1am during exam weeks.",
                            "After work shifts I only get meaningful study time after 9pm.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 2, "22-25": 2, "25+": 0},
                    },
                    {
                        "id": "theme_2",
                        "label": "Quiet study quality",
                        "response_count": 2,
                        "percentage": 25.0,
                        "representative_quotes": [
                            "Reserve more silent seats near sockets, they are full by noon.",
                            "Quiet zones should be monitored because noise rises after 8pm.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 0, "22-25": 1, "25+": 1},
                    },
                    {
                        "id": "theme_3",
                        "label": "Night travel safety",
                        "response_count": 2,
                        "percentage": 25.0,
                        "representative_quotes": [
                            "Longer hours matter, but safe routes home matter just as much.",
                            "If library closes at 10pm I lose two study hours after my commute.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 2, "22-25": 0, "25+": 0},
                    },
                ]
            },
            "sentiment_summary": {
                "overall_sentiment": "mixed",
                "sentiment_by_theme": {
                    "theme_1": "positive",
                    "theme_2": "mixed",
                    "theme_3": "negative",
                },
                "decision_made": True,
                "decision_text": "Trinity approved a four-week midnight opening pilot in Berkeley with extended stewarding.",
                "influenced_by_input": True,
                "council_briefing": {
                    "executive_summary": "Students support extending opening hours, but they also flag noise and safe travel gaps.",
                    "key_findings": [
                        "Late hours are the strongest signal",
                        "Quiet-zone reliability is inconsistent",
                        "Travel safety remains a blocker for evening study",
                    ],
                    "trade_offs": [
                        "Longer opening hours increase staffing and utilities costs",
                        "Strict quiet enforcement can reduce collaborative study options",
                    ],
                    "recommended_next_steps": [
                        "Run a midnight pilot with weekly occupancy reporting",
                        "Publish a late-route safety map with student input",
                    ],
                    "data_caveats": ["Exam-week responses may amplify stress-related concerns"],
                },
            },
            "conflicting_viewpoints": [
                {
                    "topic": "Late opening model",
                    "position_a": "Open Berkeley later every exam week night.",
                    "position_b": "Keep standard hours and invest in better daytime capacity.",
                    "split_estimate": "60-40",
                }
            ],
            "missing_voices": {
                "underrepresented_groups": [],
                "representation_health": "good",
                "recommendation": "Maintain current outreach mix while tracking response rates by cohort.",
            },
        },
        {
            "id": "tcd-002",
            "title": "Pearse Street Safety and Last-Mile Transport",
            "question": "Which safety change would most improve late campus travel after societies and labs?",
            "organisation": "Trinity College Dublin Students Union",
            "mode": "standard",
            "institution_demographics": {"16-17": 4, "18-21": 65, "22-25": 23, "25+": 8},
            "responses": [
                ("eoin", "16-17", "access_programme", "Crossing Pearse Street after evening study still feels risky.", "theme_1"),
                ("cian", "18-21", "commuter", "A reliable 11pm shuttle would help commuters massively.", "theme_2"),
                ("declan", "18-21", "societies", "Lighting from Front Gate to Pearse Station has dark patches.", "theme_1"),
                ("priya", "18-21", "disability_support", "Emergency contact points need better signage and audio support.", "theme_3"),
                ("ronan", "18-21", "sports_clubs", "After training, buses are irregular and the wait feels unsafe.", "theme_2"),
                ("tom", "22-25", "research_student", "A staffed safe-walk programme would increase confidence at night.", "theme_1"),
                ("fatima", "18-21", "international", "New students need a simple map of safe late routes.", "theme_1"),
                ("nora", "22-25", "international", "Push alerts about disruptions would reduce uncertainty and panic.", "theme_3"),
            ],
            "themes": {
                "themes": [
                    {
                        "id": "theme_1",
                        "label": "Safe route visibility",
                        "response_count": 3,
                        "percentage": 37.5,
                        "representative_quotes": [
                            "Lighting from Front Gate to Pearse Station has dark patches.",
                            "New students need a simple map of safe late routes.",
                        ],
                        "age_band_breakdown": {"16-17": 1, "18-21": 2, "22-25": 0, "25+": 0},
                    },
                    {
                        "id": "theme_2",
                        "label": "Late transport reliability",
                        "response_count": 3,
                        "percentage": 37.5,
                        "representative_quotes": [
                            "A reliable 11pm shuttle would help commuters massively.",
                            "After training, buses are irregular and the wait feels unsafe.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 2, "22-25": 1, "25+": 0},
                    },
                    {
                        "id": "theme_3",
                        "label": "Rapid support access",
                        "response_count": 2,
                        "percentage": 25.0,
                        "representative_quotes": [
                            "Emergency contact points need better signage and audio support.",
                            "Push alerts about disruptions would reduce uncertainty and panic.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 1, "22-25": 1, "25+": 0},
                    },
                ]
            },
            "sentiment_summary": {
                "overall_sentiment": "mixed",
                "sentiment_by_theme": {
                    "theme_1": "negative",
                    "theme_2": "negative",
                    "theme_3": "neutral",
                },
                "decision_made": True,
                "decision_text": "Council approved a late-route lighting audit and a six-week safe-walk volunteer pilot.",
                "influenced_by_input": True,
                "council_briefing": {
                    "executive_summary": "Safety concerns cluster around route visibility and transport reliability after 9pm.",
                    "key_findings": [
                        "Dark route segments are repeatedly flagged",
                        "Late shuttle reliability drives student confidence",
                        "Students want clearer emergency access signals",
                    ],
                    "trade_offs": [
                        "Shuttle expansion improves safety but has recurring operating cost",
                        "Volunteer programmes can scale quickly but need governance",
                    ],
                    "recommended_next_steps": [
                        "Publish a map-based action tracker for route upgrades",
                        "Measure pilot outcomes by route and time-window",
                    ],
                    "data_caveats": ["Responses skew toward students active in evening activities"],
                },
            },
            "conflicting_viewpoints": [
                {
                    "topic": "Safety presence style",
                    "position_a": "More visible safety staff increase confidence.",
                    "position_b": "Too much visible presence can feel intimidating.",
                    "split_estimate": "60-40",
                }
            ],
            "missing_voices": {
                "underrepresented_groups": [],
                "representation_health": "good",
                "recommendation": "Keep targeted outreach to evening class cohorts to sustain representation quality.",
            },
        },
        {
            "id": "tcd-003",
            "title": "Dining Hall Value and Dietary Choice",
            "question": "What single dining change would have the biggest impact on student wellbeing this term?",
            "organisation": "Trinity College Dublin Students Union",
            "mode": "standard",
            "institution_demographics": {"16-17": 6, "18-21": 54, "22-25": 28, "25+": 12},
            "responses": [
                ("aisling", "18-21", "trinity_hall", "Meal deal prices are still too high by mid-semester.", "theme_1"),
                ("declan", "18-21", "societies", "Vegan options run out early and portions vary too much.", "theme_2"),
                ("ema", "18-21", "first_generation", "A low-cost hot meal option every day would reduce stress.", "theme_1"),
                ("ronan", "18-21", "sports_clubs", "Athletes need affordable high-protein options after training.", "theme_1"),
                ("nora", "22-25", "international", "Label allergens more clearly near each counter.", "theme_2"),
                ("hugo", "22-25", "part_time_worker", "Queue times at peak lunch make short breaks unusable.", "theme_3"),
                ("sarah", "25+", "mature_learner", "Keep quality high even if discounts are targeted by need.", "theme_2"),
                ("priya", "18-21", "disability_support", "Online pre-order would help students managing fatigue and pain.", "theme_3"),
            ],
            "themes": {
                "themes": [
                    {
                        "id": "theme_1",
                        "label": "Meal affordability",
                        "response_count": 3,
                        "percentage": 37.5,
                        "representative_quotes": [
                            "Meal deal prices are still too high by mid-semester.",
                            "A low-cost hot meal option every day would reduce stress.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 3, "22-25": 0, "25+": 0},
                    },
                    {
                        "id": "theme_2",
                        "label": "Dietary variety and clarity",
                        "response_count": 3,
                        "percentage": 37.5,
                        "representative_quotes": [
                            "Vegan options run out early and portions vary too much.",
                            "Label allergens more clearly near each counter.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 2, "22-25": 1, "25+": 0},
                    },
                    {
                        "id": "theme_3",
                        "label": "Service speed",
                        "response_count": 2,
                        "percentage": 25.0,
                        "representative_quotes": [
                            "Queue times at peak lunch make short breaks unusable.",
                            "Online pre-order would help students managing fatigue and pain.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 1, "22-25": 1, "25+": 0},
                    },
                ]
            },
            "sentiment_summary": {
                "overall_sentiment": "negative",
                "sentiment_by_theme": {
                    "theme_1": "negative",
                    "theme_2": "mixed",
                    "theme_3": "negative",
                },
                "decision_made": False,
                "decision_text": "No final decision yet; finance and catering teams are reviewing costed options.",
                "influenced_by_input": False,
                "council_briefing": {
                    "executive_summary": "Students identify affordability and reliable dietary options as core wellbeing issues.",
                    "key_findings": [
                        "Price pressure is a primary concern",
                        "Dietary consistency and allergen clarity are recurring requests",
                        "Peak-time queues reduce practical access",
                    ],
                    "trade_offs": [
                        "Price reductions may constrain ingredient quality budgets",
                        "Wider menu choice can increase operational complexity",
                    ],
                    "recommended_next_steps": [
                        "Pilot one guaranteed low-cost hot meal daily",
                        "Publish allergen labels and stock visibility per service window",
                    ],
                    "data_caveats": ["Responses are concentrated in undergraduate cohorts"],
                },
            },
            "conflicting_viewpoints": [
                {
                    "topic": "Price versus quality",
                    "position_a": "Lower prices immediately, even if menu complexity is reduced.",
                    "position_b": "Protect meal quality and nutrition, even if savings are targeted.",
                    "split_estimate": "roughly equal",
                }
            ],
            "missing_voices": {
                "underrepresented_groups": [
                    {
                        "group": "22-25",
                        "institution_share": 28,
                        "response_share": 25,
                        "gap": 3,
                        "affected_themes": ["Meal affordability", "Service speed"],
                        "equity_note": "Postgraduate-adjacent cohorts are present but still lighter than expected.",
                    }
                ],
                "representation_health": "moderate",
                "recommendation": "Run one targeted outreach push in postgraduate taught programmes before final pricing decisions.",
            },
        },
        {
            "id": "tcd-004",
            "title": "Timetable Clashes and Assessment Load",
            "question": "What scheduling change would make your week significantly more manageable at Trinity?",
            "organisation": "Trinity College Dublin Students Union",
            "mode": "standard",
            "institution_demographics": {"16-17": 30, "18-21": 46, "22-25": 18, "25+": 6},
            "responses": [
                ("eoin", "16-17", "access_programme", "Back-to-back classes across campus leave no transition time.", "theme_3"),
                ("cian", "18-21", "commuter", "8am starts and 6pm finishes make commuting days unsustainable.", "theme_3"),
                ("liam", "22-25", "stem", "Large assignment deadlines land in the same 72-hour window.", "theme_1"),
                ("sarah", "25+", "mature_learner", "Part-time students need timetable certainty at least two weeks ahead.", "theme_2"),
                ("tom", "22-25", "research_student", "Seminar slots move too often for those with lab schedules.", "theme_2"),
                ("fatima", "18-21", "international", "A weekly schedule digest would reduce confusion and missed sessions.", "theme_2"),
                ("hugo", "22-25", "part_time_worker", "Please avoid rotating lecture times every week for core modules.", "theme_2"),
                ("ema", "18-21", "first_generation", "When three deadlines hit one day, feedback quality drops for everyone.", "theme_1"),
            ],
            "themes": {
                "themes": [
                    {
                        "id": "theme_1",
                        "label": "Deadline coordination",
                        "response_count": 3,
                        "percentage": 37.5,
                        "representative_quotes": [
                            "Large assignment deadlines land in the same 72-hour window.",
                            "When three deadlines hit one day, feedback quality drops for everyone.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 1, "22-25": 2, "25+": 0},
                    },
                    {
                        "id": "theme_2",
                        "label": "Timetable predictability",
                        "response_count": 3,
                        "percentage": 37.5,
                        "representative_quotes": [
                            "Part-time students need timetable certainty at least two weeks ahead.",
                            "Please avoid rotating lecture times every week for core modules.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 1, "22-25": 1, "25+": 1},
                    },
                    {
                        "id": "theme_3",
                        "label": "Daily schedule feasibility",
                        "response_count": 2,
                        "percentage": 25.0,
                        "representative_quotes": [
                            "Back-to-back classes across campus leave no transition time.",
                            "8am starts and 6pm finishes make commuting days unsustainable.",
                        ],
                        "age_band_breakdown": {"16-17": 1, "18-21": 1, "22-25": 0, "25+": 0},
                    },
                ]
            },
            "sentiment_summary": {
                "overall_sentiment": "negative",
                "sentiment_by_theme": {
                    "theme_1": "negative",
                    "theme_2": "mixed",
                    "theme_3": "negative",
                },
                "decision_made": False,
                "decision_text": "Pending school-level scheduling review before calendar changes are approved.",
                "influenced_by_input": False,
                "council_briefing": {
                    "executive_summary": "Students report persistent overload caused by deadline clustering and timetable volatility.",
                    "key_findings": [
                        "Clustered deadlines drive stress spikes",
                        "Predictability matters for commuters and part-time students",
                        "Cross-campus transitions are frequently unrealistic",
                    ],
                    "trade_offs": [
                        "Tighter coordination adds planning overhead for departments",
                        "Stable slots reduce flexibility for ad-hoc teaching changes",
                    ],
                    "recommended_next_steps": [
                        "Pilot deadline-spacing rules in two high-volume modules",
                        "Publish a fortnight schedule lock window for core lectures",
                    ],
                    "data_caveats": ["Foundation-year participation remains lower than baseline"],
                },
            },
            "conflicting_viewpoints": [
                {
                    "topic": "Schedule flexibility",
                    "position_a": "Keep flexibility for teaching teams to adapt week by week.",
                    "position_b": "Lock timetables early so students can plan work and care responsibilities.",
                    "split_estimate": "60-40",
                }
            ],
            "missing_voices": {
                "underrepresented_groups": [
                    {
                        "group": "16-17",
                        "institution_share": 30,
                        "response_share": 12.5,
                        "gap": 17.5,
                        "affected_themes": ["Daily schedule feasibility"],
                        "equity_note": "Foundation and access-route students are significantly underrepresented in this consultation.",
                    }
                ],
                "representation_health": "poor",
                "recommendation": "Run in-class outreach in access programmes before confirming timetable policy changes.",
            },
        },
        {
            "id": "tcd-005",
            "title": "Society Funding and Inclusive Events",
            "question": "What one change would make student life more inclusive across societies and clubs?",
            "organisation": "Trinity College Dublin Students Union",
            "mode": "standard",
            "institution_demographics": {"16-17": 8, "18-21": 44, "22-25": 38, "25+": 10},
            "responses": [
                ("aisling", "18-21", "trinity_hall", "Small societies need faster micro-grants for event basics.", "theme_2"),
                ("declan", "18-21", "societies", "Room booking is the biggest blocker for inclusive events.", "theme_2"),
                ("priya", "18-21", "disability_support", "Every society event page should include accessibility details by default.", "theme_1"),
                ("ronan", "18-21", "sports_clubs", "Late evening slots exclude students with jobs or care duties.", "theme_3"),
                ("nora", "22-25", "international", "Welcome events should include clear no-alcohol options and pricing info.", "theme_1"),
                ("sarah", "25+", "mature_learner", "Postgrad-friendly event times are rare and need explicit planning.", "theme_3"),
                ("eoin", "16-17", "access_programme", "Intro events should avoid clashing with core tutorial blocks.", "theme_3"),
                ("fatima", "18-21", "international", "A shared event calendar with filters would help students find relevant communities.", "theme_3"),
            ],
            "themes": {
                "themes": [
                    {
                        "id": "theme_1",
                        "label": "Inclusive event design",
                        "response_count": 3,
                        "percentage": 37.5,
                        "representative_quotes": [
                            "Every society event page should include accessibility details by default.",
                            "Welcome events should include clear no-alcohol options and pricing info.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 2, "22-25": 1, "25+": 0},
                    },
                    {
                        "id": "theme_2",
                        "label": "Funding and logistics",
                        "response_count": 3,
                        "percentage": 37.5,
                        "representative_quotes": [
                            "Small societies need faster micro-grants for event basics.",
                            "Room booking is the biggest blocker for inclusive events.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 2, "22-25": 0, "25+": 1},
                    },
                    {
                        "id": "theme_3",
                        "label": "Timing and discoverability",
                        "response_count": 2,
                        "percentage": 25.0,
                        "representative_quotes": [
                            "Late evening slots exclude students with jobs or care duties.",
                            "A shared event calendar with filters would help students find relevant communities.",
                        ],
                        "age_band_breakdown": {"16-17": 0, "18-21": 2, "22-25": 0, "25+": 0},
                    },
                ]
            },
            "sentiment_summary": {
                "overall_sentiment": "mixed",
                "sentiment_by_theme": {
                    "theme_1": "positive",
                    "theme_2": "neutral",
                    "theme_3": "negative",
                },
                "decision_made": True,
                "decision_text": "Council approved a micro-grants fast lane and mandatory accessibility metadata for society events.",
                "influenced_by_input": True,
                "council_briefing": {
                    "executive_summary": "Students want inclusion to be designed into society operations, not added later.",
                    "key_findings": [
                        "Accessibility details should be default in event publishing",
                        "Micro-grant speed is critical for smaller societies",
                        "Event timing still excludes working and care-responsibility students",
                    ],
                    "trade_offs": [
                        "Faster funding decisions require stricter post-event accountability",
                        "Mandated metadata adds admin overhead for student committees",
                    ],
                    "recommended_next_steps": [
                        "Launch a 72-hour micro-grant decision SLA",
                        "Add mandatory inclusion fields to all event templates",
                    ],
                    "data_caveats": ["22-25 cohort appears underrepresented relative to institutional baseline"],
                },
            },
            "conflicting_viewpoints": [
                {
                    "topic": "Funding governance",
                    "position_a": "Distribute micro-grants quickly with light-touch checks.",
                    "position_b": "Require stronger controls before releasing funds.",
                    "split_estimate": "roughly equal",
                }
            ],
            "missing_voices": {
                "underrepresented_groups": [
                    {
                        "group": "22-25",
                        "institution_share": 38,
                        "response_share": 12.5,
                        "gap": 25.5,
                        "affected_themes": ["Inclusive event design", "Funding and logistics"],
                        "equity_note": "Postgraduate voices are not proportionally represented in society policy feedback.",
                    }
                ],
                "representation_health": "poor",
                "recommendation": "Run a postgraduate-focused consultation sprint before finalizing the new funding framework.",
            },
        },
    ]


def seed(reset_demo_data: bool = True) -> None:
    init_db()
    db = SessionLocal()
    try:
        if reset_demo_data:
            db.query(Response).delete(synchronize_session=False)
            db.query(Analysis).delete(synchronize_session=False)
            db.query(User).delete(synchronize_session=False)
            db.query(Identity).delete(synchronize_session=False)
            db.query(Poll).delete(synchronize_session=False)
            db.commit()

        emoji_by_key = _seed_demo_accounts(db)
        samples = _poll_samples()
        rng = _demo_rng()
        target_counts = rng.sample(range(20, 111), k=len(samples))

        for idx, sample in enumerate(samples):
            poll = db.query(Poll).filter(Poll.id == sample["id"]).first()
            if not poll:
                poll = Poll(
                    id=sample["id"],
                    title=sample["title"],
                    question=sample["question"],
                    organisation=sample["organisation"],
                    mode=sample["mode"],
                    institution_demographics=sample["institution_demographics"],
                    under16_consent_confirmed=False,
                    is_active=True,
                )
            else:
                poll.title = sample["title"]
                poll.question = sample["question"]
                poll.organisation = sample["organisation"]
                poll.mode = sample["mode"]
                poll.institution_demographics = sample["institution_demographics"]
                poll.under16_consent_confirmed = False
                poll.is_active = True

            db.add(poll)
            db.flush()

            db.query(Response).filter(Response.poll_id == poll.id).delete(synchronize_session=False)

            target_count = target_counts[idx]
            generated_responses, generated_themes, generated_missing_voices = _generate_poll_responses(
                sample=sample,
                emoji_by_key=emoji_by_key,
                rng=rng,
                target_count=target_count,
            )

            for generated in generated_responses:
                db.add(
                    Response(
                        poll_id=poll.id,
                        emoji_id=generated["emoji_id"],
                        nickname=None,
                        age_band=generated["age_band"],
                        group_tag=generated["group_tag"],
                        response_text=generated["response_text"],
                        follow_up_token=str(uuid4()),
                    )
                )

            sentiment_summary = deepcopy(sample["sentiment_summary"])
            briefing = sentiment_summary.get("council_briefing")
            if isinstance(briefing, dict):
                briefing["executive_summary"] = (
                    f"{briefing.get('executive_summary', '').strip()} "
                    f"This consultation wave includes {target_count} responses."
                ).strip()

            themes_payload = {"themes": generated_themes}
            conflicts_payload = deepcopy(sample["conflicting_viewpoints"])

            analysis = db.query(Analysis).filter(Analysis.poll_id == poll.id).first()
            if not analysis:
                analysis = Analysis(
                    poll_id=poll.id,
                    themes=themes_payload,
                    sentiment_summary=sentiment_summary,
                    conflicting_viewpoints=conflicts_payload,
                    missing_voices=generated_missing_voices,
                )
                db.add(analysis)
            else:
                analysis.themes = themes_payload
                analysis.sentiment_summary = sentiment_summary
                analysis.conflicting_viewpoints = conflicts_payload
                analysis.missing_voices = generated_missing_voices
                db.add(analysis)

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed(reset_demo_data=True)
