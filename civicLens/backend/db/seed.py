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
                for idx, (band, text) in enumerate(sample["responses"]):
                    db.add(
                        Response(
                            poll_id=poll.id,
                            nickname=f"student-{idx + 1}" if idx % 2 == 0 else None,
                            age_band=band,
                            group_tag="demo",
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
