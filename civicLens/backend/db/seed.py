from uuid import uuid4

from db.database import Analysis, Poll, Response, SessionLocal, init_db


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        samples = [
            {
                "id": "1",
                "title": "Campus Mobility and Wellbeing Priorities",
                "question": "What should your council prioritize first to improve the daily student experience?",
                "organisation": "CivicLens Demo College",
                "mode": "standard",
                "institution_demographics": {"16-17": 40, "18-21": 45, "22+": 15},
                "responses": [
                    ("16-17", "More quiet study zones near labs"),
                    ("18-21", "Extend library hours into evenings"),
                    ("18-21", "Improve bus stop lighting and safety"),
                    ("22-25", "Better timetable change notifications"),
                    ("25+", "Affordable healthy cafeteria options"),
                ],
                "themes": {
                    "themes": [
                        {
                            "id": "theme_1",
                            "label": "Study Spaces",
                            "response_count": 2,
                            "percentage": 40,
                            "representative_quotes": [
                                "We need more quiet study zones.",
                                "Labs are too noisy during revision.",
                            ],
                            "age_band_breakdown": {"16-17": 1, "18-21": 1, "22-25": 0},
                        },
                        {
                            "id": "theme_2",
                            "label": "Transport Safety",
                            "response_count": 2,
                            "percentage": 40,
                            "representative_quotes": [
                                "Bus stop lighting should be improved.",
                                "Evening commute feels unsafe.",
                            ],
                            "age_band_breakdown": {"16-17": 0, "18-21": 1, "22-25": 1},
                        },
                        {
                            "id": "theme_3",
                            "label": "Food Affordability",
                            "response_count": 1,
                            "percentage": 20,
                            "representative_quotes": ["Healthy food should be cheaper."],
                            "age_band_breakdown": {"16-17": 0, "18-21": 0, "22-25": 1},
                        },
                    ]
                },
                "sentiment_summary": {
                    "decision_made": True,
                    "decision_text": "Council approved extended library hours and a safety lighting pilot.",
                    "influenced_by_input": True,
                    "council_briefing": {
                        "executive_summary": "Students prioritized study spaces and evening safety.",
                        "key_findings": ["Study space demand is high", "Transport safety concerns are consistent"],
                        "trade_offs": ["Budget split between facilities and safety"],
                        "recommended_next_steps": ["Pilot quiet zones", "Coordinate with transit authority"],
                        "data_caveats": ["Small sample size"],
                    },
                },
                "conflicting_viewpoints": [
                    {
                        "topic": "Library hours",
                        "position_a": "Open later",
                        "position_b": "Open earlier",
                        "split_estimate": "60-40",
                    }
                ],
                "missing_voices": {
                    "underrepresented_groups": [
                        {
                            "group": "16-17",
                            "institution_share": 40,
                            "response_share": 20,
                            "gap": 20,
                            "affected_themes": ["Study Spaces"],
                            "equity_note": "Younger students appear less represented in responses.",
                        }
                    ],
                    "representation_health": "moderate",
                    "recommendation": "Run targeted outreach in first-year classes.",
                },
            },
            {
                "id": "2",
                "title": "Digital Learning Experience",
                "question": "Which digital learning improvement would help you most this term?",
                "organisation": "CivicLens Demo College",
                "mode": "standard",
                "institution_demographics": {"16-17": 35, "18-21": 50, "22+": 15},
                "responses": [
                    ("16-17", "Need more reliable campus Wi-Fi"),
                    ("18-21", "Lecture recordings should be uploaded faster"),
                    ("18-21", "Improve LMS navigation and search"),
                    ("22-25", "One dashboard for deadlines"),
                ],
                "themes": {
                    "themes": [
                        {
                            "id": "theme_1",
                            "label": "Wi-Fi Reliability",
                            "response_count": 1,
                            "percentage": 25,
                            "representative_quotes": ["Wi-Fi drops during online quizzes."],
                            "age_band_breakdown": {"16-17": 1, "18-21": 0, "22-25": 0},
                        },
                        {
                            "id": "theme_2",
                            "label": "Lecture Recordings",
                            "response_count": 1,
                            "percentage": 25,
                            "representative_quotes": ["Recordings should be available same day."],
                            "age_band_breakdown": {"16-17": 0, "18-21": 1, "22-25": 0},
                        },
                        {
                            "id": "theme_3",
                            "label": "LMS Usability",
                            "response_count": 2,
                            "percentage": 50,
                            "representative_quotes": ["Search and navigation are confusing."],
                            "age_band_breakdown": {"16-17": 0, "18-21": 1, "22-25": 1},
                        },
                    ]
                },
                "sentiment_summary": {
                    "decision_made": False,
                    "decision_text": "No decision has been recorded yet.",
                    "influenced_by_input": False,
                    "council_briefing": {
                        "executive_summary": "Students highlighted LMS usability and content availability.",
                        "key_findings": ["LMS navigation causes friction", "Recording timeliness matters"],
                        "trade_offs": ["Platform changes require IT coordination"],
                        "recommended_next_steps": ["Define LMS quick wins", "Publish recording SLA"],
                        "data_caveats": ["Awaiting broader participation"],
                    },
                },
                "conflicting_viewpoints": [],
                "missing_voices": {
                    "underrepresented_groups": [],
                    "representation_health": "good",
                    "recommendation": "Continue collecting responses for stronger confidence.",
                },
            },
            {
                "id": "3",
                "title": "Assessment Fairness and Feedback Speed",
                "question": "What should we change first to make assessment feel fair and useful?",
                "organisation": "CivicLens Demo College",
                "mode": "standard",
                "institution_demographics": {"16-17": 30, "18-21": 50, "22+": 20},
                "responses": [
                    ("16-17", "Feedback takes too long after tests, we forget what we did wrong.", "first_year"),
                    ("18-21", "Rubrics are vague and each tutor marks differently.", "engineering"),
                    ("18-21", "Anonymous marking should be default for major coursework.", "social_science"),
                    ("22-25", "Group project marks are unfair when one person does most of the work.", "postgrad"),
                    ("18-21", "I want faster feedback even if comments are shorter.", "business"),
                    ("25+", "Quality feedback matters more than speed for final submissions.", "part_time"),
                    ("18-21", "Resit guidance is unclear and published too late.", "healthcare"),
                    ("16-17", "Examples of high-scoring work would help us understand standards.", "first_year"),
                    ("22-25", "Please align deadlines so we do not have three finals in one week.", "postgrad"),
                ],
                "themes": {
                    "themes": [
                        {
                            "id": "theme_1",
                            "label": "Feedback speed and quality",
                            "response_count": 4,
                            "percentage": 44.4,
                            "representative_quotes": [
                                "Feedback takes too long after tests.",
                                "Quality feedback matters more than speed.",
                            ],
                            "age_band_breakdown": {"16-17": 1, "18-21": 2, "22-25": 0, "25+": 1},
                        },
                        {
                            "id": "theme_2",
                            "label": "Marking fairness",
                            "response_count": 3,
                            "percentage": 33.3,
                            "representative_quotes": [
                                "Rubrics are vague and tutors mark differently.",
                                "Anonymous marking should be default.",
                            ],
                            "age_band_breakdown": {"16-17": 0, "18-21": 2, "22-25": 1, "25+": 0},
                        },
                        {
                            "id": "theme_3",
                            "label": "Assessment planning clarity",
                            "response_count": 2,
                            "percentage": 22.2,
                            "representative_quotes": [
                                "Resit guidance is unclear.",
                                "Three finals in one week is too much.",
                            ],
                            "age_band_breakdown": {"16-17": 1, "18-21": 1, "22-25": 0, "25+": 0},
                        },
                    ]
                },
                "sentiment_summary": {
                    "decision_made": False,
                    "decision_text": "Pending moderation committee review.",
                    "influenced_by_input": False,
                    "council_briefing": {
                        "executive_summary": "Students report both fairness and timeliness concerns in current assessment workflows.",
                        "key_findings": [
                            "Feedback speed is a recurring pain point",
                            "Consistency in marking criteria is perceived as weak",
                            "Deadline clustering is creating stress peaks",
                        ],
                        "trade_offs": [
                            "Faster feedback may reduce depth of comments",
                            "Stricter moderation may increase turnaround time",
                        ],
                        "recommended_next_steps": [
                            "Set a publish-by date for feedback",
                            "Pilot anonymous marking for one assessment block",
                        ],
                        "data_caveats": ["Sample skews toward 18-21 students"],
                    },
                },
                "conflicting_viewpoints": [
                    {
                        "topic": "Feedback strategy",
                        "position_a": "Students want feedback faster, even if shorter.",
                        "position_b": "Students prefer detailed comments, even if it takes longer.",
                        "split_estimate": "roughly equal",
                    }
                ],
                "missing_voices": {
                    "underrepresented_groups": [
                        {
                            "group": "25+",
                            "institution_share": 20,
                            "response_share": 11.1,
                            "gap": 8.9,
                            "affected_themes": ["Feedback speed and quality"],
                            "equity_note": "Mature learners are less visible in this consultation round.",
                        }
                    ],
                    "representation_health": "moderate",
                    "recommendation": "Collect targeted feedback from part-time and mature cohorts.",
                },
            },
            {
                "id": "4",
                "title": "Campus Safety, Social Spaces, and Belonging",
                "question": "What one change would most improve your sense of safety and belonging on campus?",
                "organisation": "CivicLens Demo College",
                "mode": "standard",
                "institution_demographics": {"16-17": 28, "18-21": 52, "22+": 20},
                "responses": [
                    ("16-17", "More staff presence around bus stops after 6pm.", "first_year"),
                    ("18-21", "Student common rooms close too early and feel unwelcoming.", "arts"),
                    ("18-21", "Lighting between library and residences is poor.", "engineering"),
                    ("22-25", "I need quiet social spaces that are not just loud cafes.", "postgrad"),
                    ("18-21", "Security reporting takes too many steps in the app.", "business"),
                    ("25+", "Evening classes end late and transport links feel unsafe.", "part_time"),
                    ("18-21", "Peer mentors helped me settle in; expand that program.", "healthcare"),
                    ("16-17", "As a new student, I do not know where to find support after incidents.", "first_year"),
                    ("22-25", "Gender-neutral rest areas would improve comfort for many students.", "postgrad"),
                    ("18-21", "Late-night study should include visible support staff.", "engineering"),
                ],
                "themes": {
                    "themes": [
                        {
                            "id": "theme_1",
                            "label": "Night safety and visibility",
                            "response_count": 5,
                            "percentage": 50,
                            "representative_quotes": [
                                "Lighting between library and residences is poor.",
                                "Transport links feel unsafe after evening classes.",
                            ],
                            "age_band_breakdown": {"16-17": 1, "18-21": 3, "22-25": 0, "25+": 1},
                        },
                        {
                            "id": "theme_2",
                            "label": "Inclusive social spaces",
                            "response_count": 3,
                            "percentage": 30,
                            "representative_quotes": [
                                "Common rooms close too early.",
                                "Need quieter social spaces.",
                            ],
                            "age_band_breakdown": {"16-17": 0, "18-21": 1, "22-25": 2, "25+": 0},
                        },
                        {
                            "id": "theme_3",
                            "label": "Support access and response",
                            "response_count": 2,
                            "percentage": 20,
                            "representative_quotes": [
                                "Security reporting takes too many steps.",
                                "Expand peer mentor program.",
                            ],
                            "age_band_breakdown": {"16-17": 1, "18-21": 1, "22-25": 0, "25+": 0},
                        },
                    ]
                },
                "sentiment_summary": {
                    "decision_made": True,
                    "decision_text": "Council approved a 10-week night safety pilot and social space extension trial.",
                    "influenced_by_input": True,
                    "council_briefing": {
                        "executive_summary": "Students link belonging strongly with visible safety measures and inclusive spaces.",
                        "key_findings": [
                            "Night safety is the dominant concern",
                            "Students need varied social environments",
                            "Support channels should be simpler and faster",
                        ],
                        "trade_offs": [
                            "Longer opening hours increase staffing costs",
                            "Extra security visibility must avoid creating anxiety",
                        ],
                        "recommended_next_steps": [
                            "Implement a mapped safe-route lighting plan",
                            "Pilot extended common room hours with attendance tracking",
                        ],
                        "data_caveats": ["Single institution sample"],
                    },
                },
                "conflicting_viewpoints": [
                    {
                        "topic": "Safety presence",
                        "position_a": "More visible security improves confidence.",
                        "position_b": "Too much security visibility can feel intimidating.",
                        "split_estimate": "60-40",
                    }
                ],
                "missing_voices": {
                    "underrepresented_groups": [],
                    "representation_health": "good",
                    "recommendation": "Maintain current outreach rhythm and monitor representation by cohort.",
                },
            },
        ]

        for sample in samples:
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
                db.add(poll)
                db.flush()

            existing_responses = db.query(Response).filter(Response.poll_id == poll.id).count()
            if existing_responses == 0:
                for idx, row in enumerate(sample["responses"]):
                    if len(row) == 2:
                        band, text = row
                        group = "demo"
                    else:
                        band, text, group = row
                    db.add(
                        Response(
                            poll_id=poll.id,
                            nickname=f"student-{idx + 1}" if idx % 2 == 0 else None,
                            age_band=band,
                            group_tag=group,
                            response_text=text,
                            follow_up_token=str(uuid4()),
                        )
                    )

            analysis = db.query(Analysis).filter(Analysis.poll_id == poll.id).first()
            if not analysis:
                analysis = Analysis(
                    poll_id=poll.id,
                    themes=sample["themes"],
                    sentiment_summary=sample["sentiment_summary"],
                    conflicting_viewpoints=sample["conflicting_viewpoints"],
                    missing_voices=sample["missing_voices"],
                )
                db.add(analysis)
            else:
                analysis.themes = sample["themes"]
                analysis.sentiment_summary = sample["sentiment_summary"]
                analysis.conflicting_viewpoints = sample["conflicting_viewpoints"]
                analysis.missing_voices = sample["missing_voices"]
                db.add(analysis)

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
