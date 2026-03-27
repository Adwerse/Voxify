import json
import os
import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from openai import OpenAI
from sqlalchemy.orm import Session

from db.database import Analysis, Poll, Response, get_db
from models.schemas import AnalyticsRead, AnalysisRead, InstitutionalReportRead, StudentReportRead

router = APIRouter(prefix="/polls", tags=["analysis"])


def _safe_json_text(value: Any) -> str:
	return json.dumps(value, ensure_ascii=True)


def _extract_json_from_text(text: str) -> dict[str, Any]:
	raw = text.strip()
	if raw.startswith("```"):
		lines = raw.splitlines()
		if len(lines) >= 3:
			raw = "\n".join(lines[1:-1]).strip()

	start = raw.find("{")
	end = raw.rfind("}")
	if start == -1 or end == -1 or end <= start:
		raise ValueError("No JSON object found in model output")

	return json.loads(raw[start : end + 1])


def _call_openai_json(
	client: OpenAI,
	model: str,
	system_prompt: str,
	user_prompt: str,
) -> dict[str, Any]:
	completion = client.chat.completions.create(
		model=model,
		temperature=0.2,
		response_format={"type": "json_object"},
		messages=[
			{"role": "system", "content": system_prompt},
			{"role": "user", "content": user_prompt},
		],
	)

	content = completion.choices[0].message.content
	if not content:
		raise ValueError("OpenAI response was empty")

	return _extract_json_from_text(content)


def _age_distribution(responses: list[Response]) -> dict[str, float]:
	total = len(responses)
	buckets: dict[str, int] = {"16-17": 0, "18-21": 0, "22-25": 0, "25+": 0}
	for item in responses:
		if item.age_band in buckets:
			buckets[item.age_band] += 1

	if total == 0:
		return {key: 0.0 for key in buckets}

	return {key: round((count / total) * 100, 2) for key, count in buckets.items()}


def _coerce_float(value: Any) -> float | None:
	if isinstance(value, (int, float)):
		return float(value)
	if isinstance(value, str):
		stripped = value.strip().replace("%", "")
		try:
			return float(stripped)
		except ValueError:
			return None
	return None


def _pick_theme_label(text: str) -> str:
	lower = text.lower()
	theme_rules = [
		("Campus facilities and spaces", ["library", "classroom", "lab", "building", "room", "seating", "canteen"]),
		("Transport and commuting", ["bus", "train", "transport", "commute", "parking", "traffic", "cycle"]),
		("Timetable and workload", ["schedule", "timetable", "deadline", "workload", "exam", "lesson", "class time"]),
		("Digital tools and connectivity", ["wifi", "internet", "portal", "app", "laptop", "digital", "online"]),
		("Wellbeing and support", ["stress", "mental", "wellbeing", "support", "counsel", "anxiety", "burnout"]),
		("Teaching quality and feedback", ["teacher", "lecturer", "feedback", "teaching", "explain", "marking", "assessment"]),
	]

	for label, keywords in theme_rules:
		if any(keyword in lower for keyword in keywords):
			return label

	return "General student experience"


def _sentiment_for_text(text: str) -> str:
	lower = text.lower()
	positive_words = ["good", "great", "better", "helpful", "improve", "like", "supportive", "positive", "excellent"]
	negative_words = ["bad", "poor", "worse", "issue", "problem", "difficult", "slow", "stress", "frustrat"]
	positive_hits = sum(1 for word in positive_words if word in lower)
	negative_hits = sum(1 for word in negative_words if word in lower)

	if positive_hits > negative_hits:
		return "positive"
	if negative_hits > positive_hits:
		return "negative"
	return "neutral"


def _build_missing_voices(
	demographics_json: dict[str, Any],
	response_distribution: dict[str, float],
	theme_labels: list[str],
) -> dict[str, Any]:
	if not demographics_json:
		return {
			"underrepresented_groups": [],
			"representation_health": "unknown",
			"recommendation": "Baseline demographics were not configured.",
		}

	underrepresented: list[dict[str, Any]] = []
	for group, institution_value in demographics_json.items():
		institution_share = _coerce_float(institution_value)
		response_share = _coerce_float(response_distribution.get(group, 0.0))
		if institution_share is None or response_share is None:
			continue

		gap = round(institution_share - response_share, 2)
		if gap > 15:
			underrepresented.append(
				{
					"group": group,
					"institution_share": round(institution_share, 2),
					"response_share": round(response_share, 2),
					"gap": gap,
					"affected_themes": theme_labels[:2] if theme_labels else ["General student experience"],
					"equity_note": f"{group} appears substantially underrepresented in responses.",
				}
			)

	if not underrepresented:
		representation_health = "good"
		recommendation = "Current response mix broadly reflects the configured baseline demographics."
	elif len(underrepresented) == 1:
		representation_health = "moderate"
		recommendation = "Run one targeted outreach push to improve representation for the identified group."
	else:
		representation_health = "poor"
		recommendation = "Use targeted follow-up sessions and direct outreach to close representation gaps."

	return {
		"underrepresented_groups": underrepresented,
		"representation_health": representation_health,
		"recommendation": recommendation,
	}


def _build_fallback_analysis(
	poll: Poll,
	responses: list[Response],
	response_texts: list[str],
	demographics_json: dict[str, Any],
	response_distribution: dict[str, float],
) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
	theme_buckets: dict[str, dict[str, Any]] = {}
	theme_sentiments: dict[str, list[str]] = {}

	for idx, response in enumerate(responses):
		text = response.response_text.strip() if response.response_text else ""
		if not text:
			continue

		label = _pick_theme_label(text)
		if label not in theme_buckets:
			theme_buckets[label] = {
				"quotes": [],
				"count": 0,
				"ages": {"16-17": 0, "18-21": 0, "22-25": 0, "25+": 0},
			}
			theme_sentiments[label] = []

		bucket = theme_buckets[label]
		bucket["count"] += 1
		if len(bucket["quotes"]) < 2:
			bucket["quotes"].append(text[:220])
		if response.age_band in bucket["ages"]:
			bucket["ages"][response.age_band] += 1

		theme_sentiments[label].append(_sentiment_for_text(text))

	if not theme_buckets and response_texts:
		theme_buckets["General student experience"] = {
			"quotes": response_texts[:2],
			"count": len(response_texts),
			"ages": {"16-17": 0, "18-21": 0, "22-25": 0, "25+": 0},
		}
		theme_sentiments["General student experience"] = [_sentiment_for_text(text) for text in response_texts]

	total = max(len(response_texts), 1)
	sorted_items = sorted(theme_buckets.items(), key=lambda item: item[1]["count"], reverse=True)[:6]

	themes: list[dict[str, Any]] = []
	for order, (label, data) in enumerate(sorted_items, start=1):
		theme_id = f"theme_{order}_{re.sub(r'[^a-z0-9]+', '_', label.lower()).strip('_')}"
		themes.append(
			{
				"id": theme_id,
				"label": label,
				"response_count": data["count"],
				"percentage": round((data["count"] / total) * 100, 2),
				"representative_quotes": data["quotes"],
				"age_band_breakdown": data["ages"],
			}
		)

	sentiment_by_theme: dict[str, str] = {}
	positive_total = 0
	negative_total = 0
	conflicts: list[dict[str, Any]] = []

	for theme in themes:
		label = theme["label"]
		theme_id = theme["id"]
		theme_votes = theme_sentiments.get(label, [])
		positive_count = sum(1 for value in theme_votes if value == "positive")
		negative_count = sum(1 for value in theme_votes if value == "negative")
		positive_total += positive_count
		negative_total += negative_count

		if positive_count > negative_count:
			sentiment_by_theme[theme_id] = "positive"
		elif negative_count > positive_count:
			sentiment_by_theme[theme_id] = "negative"
		elif positive_count == 0 and negative_count == 0:
			sentiment_by_theme[theme_id] = "neutral"
		else:
			sentiment_by_theme[theme_id] = "mixed"

		if positive_count > 0 and negative_count > 0:
			conflicts.append(
				{
					"topic": label,
					"position_a": "Some students view this area positively and want to preserve current strengths.",
					"position_b": "Others report clear pain points and request immediate improvements.",
					"split_estimate": "60-40",
				}
			)

	if positive_total > negative_total:
		overall_sentiment = "positive"
	elif negative_total > positive_total:
		overall_sentiment = "negative"
	elif positive_total == 0 and negative_total == 0:
		overall_sentiment = "neutral"
	else:
		overall_sentiment = "mixed"

	theme_labels = [theme["label"] for theme in themes]
	missing_voices = _build_missing_voices(demographics_json, response_distribution, theme_labels)

	key_findings = [
		f"{theme['label']} was mentioned by {theme['response_count']} responses ({theme['percentage']}%)."
		for theme in themes[:3]
	]
	if not key_findings:
		key_findings = ["Responses were limited, so findings should be treated as directional."]

	briefing = {
		"executive_summary": (
			f"This consultation on '{poll.question}' gathered {len(response_texts)} responses. "
			"The analysis below was generated using fallback heuristics due to unavailable AI provider authentication."
		),
		"key_findings": key_findings,
		"trade_offs": [
			"Students value rapid improvements, but budget and implementation capacity may constrain pace.",
			"Prioritising one major theme may reduce near-term progress on lower-frequency concerns.",
		],
		"recommended_next_steps": [
			"Validate top themes through a short targeted follow-up poll.",
			"Publish a timeline for actions on the highest-frequency concern.",
		],
		"data_caveats": [
			"Fallback analysis was used because AI credentials were unavailable or invalid.",
			"Themes are keyword-clustered and should be reviewed by staff before formal decisions.",
		],
	}

	return (
		{"themes": themes},
		{"overall_sentiment": overall_sentiment, "sentiment_by_theme": sentiment_by_theme},
		conflicts,
		missing_voices,
		briefing,
	)


def _save_analysis(
	db: Session,
	poll_id: str,
	themes: Any,
	sentiment_summary: Any,
	conflicting_viewpoints: Any,
	missing_voices: Any,
) -> Analysis:
	existing = db.query(Analysis).filter(Analysis.poll_id == poll_id).first()
	if existing:
		existing.themes = themes
		existing.sentiment_summary = sentiment_summary
		existing.conflicting_viewpoints = conflicting_viewpoints
		existing.missing_voices = missing_voices
		existing.generated_at = datetime.utcnow()
		db.add(existing)
		db.commit()
		db.refresh(existing)
		return existing

	record = Analysis(
		poll_id=poll_id,
		themes=themes,
		sentiment_summary=sentiment_summary,
		conflicting_viewpoints=conflicting_viewpoints,
		missing_voices=missing_voices,
	)
	db.add(record)
	db.commit()
	db.refresh(record)
	return record


def _group_distribution(responses: list[Response]) -> dict[str, int]:
	distribution: dict[str, int] = {}
	for item in responses:
		group = (item.group_tag or "unspecified").strip() or "unspecified"
		distribution[group] = distribution.get(group, 0) + 1
	return dict(sorted(distribution.items(), key=lambda pair: pair[1], reverse=True))


def _sentiment_distribution(sentiment_summary: dict[str, Any], themes: list[dict[str, Any]]) -> dict[str, float]:
	sentiment_by_theme = sentiment_summary.get("sentiment_by_theme", {}) if isinstance(sentiment_summary, dict) else {}
	if not isinstance(sentiment_by_theme, dict) or not themes:
		return {"positive": 0.0, "neutral": 100.0, "negative": 0.0}

	counts = {"positive": 0, "neutral": 0, "negative": 0}
	for theme in themes:
		theme_id = str(theme.get("id", ""))
		value = str(sentiment_by_theme.get(theme_id, "neutral")).lower()
		if value == "mixed":
			counts["positive"] += 1
			counts["negative"] += 1
		elif value in counts:
			counts[value] += 1
		else:
			counts["neutral"] += 1

	total = max(sum(counts.values()), 1)
	return {
		"positive": round((counts["positive"] / total) * 100, 2),
		"neutral": round((counts["neutral"] / total) * 100, 2),
		"negative": round((counts["negative"] / total) * 100, 2),
	}


def _trend_indicators(db: Session, poll: Poll, current_themes: list[dict[str, Any]], response_count: int) -> dict[str, Any]:
	previous_poll = (
		db.query(Poll)
		.filter(
			Poll.organisation == poll.organisation,
			Poll.id != poll.id,
			Poll.created_at < poll.created_at,
		)
		.order_by(Poll.created_at.desc())
		.first()
	)

	if not previous_poll:
		return {
			"compared_poll_id": None,
			"response_delta": 0,
			"response_delta_pct": 0.0,
			"top_theme_changed": False,
		}

	previous_count = db.query(Response).filter(Response.poll_id == previous_poll.id).count()
	response_delta = response_count - previous_count
	response_delta_pct = round((response_delta / previous_count) * 100, 2) if previous_count > 0 else 0.0

	previous_analysis = db.query(Analysis).filter(Analysis.poll_id == previous_poll.id).first()
	current_top = str(current_themes[0].get("label", "")).strip() if current_themes else ""
	previous_top = ""
	if previous_analysis and isinstance(previous_analysis.themes, dict):
		prev_themes = previous_analysis.themes.get("themes", [])
		if isinstance(prev_themes, list) and prev_themes:
			previous_top = str(prev_themes[0].get("label", "")).strip()

	return {
		"compared_poll_id": previous_poll.id,
		"response_delta": response_delta,
		"response_delta_pct": response_delta_pct,
		"top_theme_changed": bool(current_top and previous_top and current_top != previous_top),
	}


def _build_analytics_payload(db: Session, poll: Poll, analysis: Analysis, responses: list[Response]) -> dict[str, Any]:
	themes_raw = analysis.themes if isinstance(analysis.themes, dict) else {}
	themes = themes_raw.get("themes", []) if isinstance(themes_raw.get("themes", []), list) else []

	participation = {
		"total_responses": len(responses),
		"responses_per_age_band": _age_distribution_counts(responses),
		"responses_per_group": _group_distribution(responses),
	}

	sentiment_summary = analysis.sentiment_summary if isinstance(analysis.sentiment_summary, dict) else {}
	trend = _trend_indicators(db, poll, themes, len(responses))
	conflicts = analysis.conflicting_viewpoints if isinstance(analysis.conflicting_viewpoints, list) else []
	missing_voices = analysis.missing_voices if isinstance(analysis.missing_voices, dict) else {}

	affected_groups = [
		str(item.get("group", "")).strip()
		for item in missing_voices.get("underrepresented_groups", [])
		if isinstance(item, dict) and str(item.get("group", "")).strip()
	]

	trade_offs = [
		f"{item.get('topic', 'Unknown topic')}: balance {item.get('position_a', 'position A')} vs {item.get('position_b', 'position B')}"
		for item in conflicts[:3]
		if isinstance(item, dict)
	]

	return {
		"poll_id": poll.id,
		"generated_at": analysis.generated_at,
		"participation": participation,
		"top_themes": themes[:6],
		"sentiment_distribution": _sentiment_distribution(sentiment_summary, themes),
		"trend_indicators": trend,
		"conflicting_viewpoints": conflicts,
		"missing_voices": missing_voices,
		"impact": {
			"summary": "Potential policy impact is highest in the top two themes and among underrepresented cohorts.",
			"affected_groups": affected_groups,
			"trade_offs": trade_offs,
		},
	}


def _age_distribution_counts(responses: list[Response]) -> dict[str, int]:
	buckets: dict[str, int] = {"16-17": 0, "18-21": 0, "22-25": 0, "25+": 0}
	for item in responses:
		if item.age_band in buckets:
			buckets[item.age_band] += 1
	return buckets


def _build_student_report(analytics: dict[str, Any]) -> dict[str, Any]:
	themes = analytics.get("top_themes", []) if isinstance(analytics.get("top_themes"), list) else []
	theme_items: list[dict[str, str]] = []
	for item in themes[:5]:
		if not isinstance(item, dict):
			continue
		quotes = item.get("representative_quotes", [])
		quote = str(quotes[0]) if isinstance(quotes, list) and quotes else "No direct quote available."
		label = str(item.get("label", "Theme"))
		response_count = int(item.get("response_count", 0))
		theme_items.append(
			{
				"theme": label,
				"key_insight": f"{response_count} students mentioned this theme.",
				"quote": quote,
			}
		)

	sentiment = analytics.get("sentiment_distribution", {})
	positive = float(sentiment.get("positive", 0.0)) if isinstance(sentiment, dict) else 0.0
	neutral = float(sentiment.get("neutral", 0.0)) if isinstance(sentiment, dict) else 0.0
	negative = float(sentiment.get("negative", 0.0)) if isinstance(sentiment, dict) else 0.0

	return {
		"poll_id": analytics.get("poll_id"),
		"generated_at": analytics.get("generated_at"),
		"what_students_said": "Students shared clear priorities around day-to-day learning experience, support, and fairness.",
		"top_themes": theme_items,
		"sentiment_summary": f"Overall mood: {positive}% positive, {neutral}% neutral, {negative}% negative.",
		"transparency_note": "This summary reflects submitted responses and may not represent every student group equally.",
	}


def _build_institutional_report(analytics: dict[str, Any]) -> dict[str, Any]:
	themes = analytics.get("top_themes", []) if isinstance(analytics.get("top_themes"), list) else []
	participation = analytics.get("participation", {}) if isinstance(analytics.get("participation"), dict) else {}
	missing_voices = analytics.get("missing_voices", {}) if isinstance(analytics.get("missing_voices"), dict) else {}
	conflicts = analytics.get("conflicting_viewpoints", []) if isinstance(analytics.get("conflicting_viewpoints"), list) else []

	considerations = [
		"Prioritise interventions that address the top two themes while monitoring equity impact.",
		"Run a targeted follow-up campaign for underrepresented groups before final decisions.",
	]

	if conflicts:
		considerations.append("Design options that explicitly acknowledge the strongest trade-offs reported by students.")

	return {
		"poll_id": analytics.get("poll_id"),
		"generated_at": analytics.get("generated_at"),
		"executive_summary": "This report translates student feedback into structured insights to support transparent institutional decision-making.",
		"key_themes": themes,
		"demographic_breakdown": {
			"responses_per_age_band": participation.get("responses_per_age_band", {}),
			"responses_per_group": participation.get("responses_per_group", {}),
		},
		"conflicting_viewpoints": conflicts,
		"missing_voices": missing_voices,
		"suggested_considerations": considerations,
	}


@router.post("/{poll_id}/analyse")
def analyse_poll(poll_id: str, db: Session = Depends(get_db)) -> JSONResponse:
	poll = db.query(Poll).filter(Poll.id == poll_id).first()
	if not poll:
		raise HTTPException(status_code=404, detail="Poll not found")

	responses = db.query(Response).filter(Response.poll_id == poll_id).order_by(Response.submitted_at.asc()).all()
	response_texts = [item.response_text.strip() for item in responses if item.response_text and item.response_text.strip()]

	if not response_texts:
		raise HTTPException(status_code=422, detail="Poll has no responses to analyse")

	openai_api_key = (os.getenv("OPENAI_API_KEY", "") or "").strip()
	openai_model = (os.getenv("OPENAI_MODEL", "") or "").strip() or "gpt-4.1-mini"
	client = OpenAI(api_key=openai_api_key) if openai_api_key else None
	numbered_responses = "\n".join([f"{idx + 1}. {text}" for idx, text in enumerate(response_texts)])
	response_count = len(response_texts)
	demographics_json = poll.institution_demographics if isinstance(poll.institution_demographics, dict) else {}
	response_distribution = _age_distribution(responses)

	themes_result: dict[str, Any] = {"themes": []}
	sentiment_result: dict[str, Any] = {"overall_sentiment": "mixed", "sentiment_by_theme": {}}
	conflicts_result: list[dict[str, Any]] = []
	missing_voices_result: dict[str, Any] = {
		"underrepresented_groups": [],
		"representation_health": "unknown",
		"recommendation": "Baseline demographics were not configured.",
	}
	briefing_result: dict[str, Any] = {
		"executive_summary": "Briefing unavailable due to analysis failure.",
		"key_findings": [],
		"trade_offs": [],
		"recommended_next_steps": [],
		"data_caveats": ["Analysis did not complete fully."],
	}
	errors: list[str] = []
	warnings: list[str] = []

	if client is None:
		warnings.append("OPENAI_API_KEY is not configured. Falling back to heuristic analysis.")

	try:
		if client is None:
			raise RuntimeError("OPENAI_API_KEY is not configured")
		themes_result = _call_openai_json(
			client,
			openai_model,
			"You are a civic engagement analyst. Return only valid JSON.",
			(
				f"Analyse these {response_count} student responses to: \"{poll.question}\"\n\n"
				f"Responses:\n{numbered_responses}\n\n"
				"Return JSON:\n"
				"{\n"
				'  "themes": [\n'
				"    {\n"
				'      "id": "theme_1",\n'
				'      "label": "string (3-5 words)",\n'
				'      "response_count": int,\n'
				'      "percentage": float,\n'
				'      "representative_quotes": ["quote1", "quote2"],\n'
				'      "age_band_breakdown": {"16-17": int, "18-21": int, "22-25": int}\n'
				"    }\n"
				"  ]\n"
				"}\n"
				"Max 6 themes. Order by response_count descending."
			),
		)
	except Exception as exc:
		errors.append(f"CALL_1_THEME_CLUSTERING_FAILED: {exc}")

	try:
		if client is None:
			raise RuntimeError("OPENAI_API_KEY is not configured")
		responses_sample = response_texts[:30]
		call_2 = _call_openai_json(
			client,
			openai_model,
			"You are a civic engagement analyst. Return only valid JSON.",
			(
				f"Given these themes from a student consultation: {_safe_json_text(themes_result)}\n"
				f"And raw responses: {_safe_json_text(responses_sample)}\n\n"
				"Return JSON:\n"
				"{\n"
				'  "overall_sentiment": "positive|neutral|negative|mixed",\n'
				'  "sentiment_by_theme": {\n'
				'    "theme_id": "positive|neutral|negative|mixed"\n'
				"  },\n"
				'  "conflicting_viewpoints": [\n'
				"    {\n"
				'      "topic": "string",\n'
				'      "position_a": "string",\n'
				'      "position_b": "string",\n'
				'      "split_estimate": "roughly equal|60-40|strong majority"\n'
				"    }\n"
				"  ]\n"
				"}\n"
				"Only include genuine conflicts, not just majority vs minority."
			),
		)
		sentiment_result = {
			"overall_sentiment": call_2.get("overall_sentiment", "mixed"),
			"sentiment_by_theme": call_2.get("sentiment_by_theme", {}),
		}
		conflicting_raw = call_2.get("conflicting_viewpoints", [])
		conflicts_result = conflicting_raw if isinstance(conflicting_raw, list) else []
	except Exception as exc:
		errors.append(f"CALL_2_SENTIMENT_CONFLICTS_FAILED: {exc}")

	try:
		if client is None:
			raise RuntimeError("OPENAI_API_KEY is not configured")
		theme_age_breakdown: list[dict[str, Any]] = []
		themes_array = themes_result.get("themes", []) if isinstance(themes_result, dict) else []
		if isinstance(themes_array, list):
			for theme in themes_array:
				if isinstance(theme, dict):
					theme_age_breakdown.append(
						{
							"theme_id": theme.get("id"),
							"label": theme.get("label"),
							"age_band_breakdown": theme.get("age_band_breakdown", {}),
						}
					)

		missing_voices_result = _call_openai_json(
			client,
			openai_model,
			"You are a civic equity analyst. Return only valid JSON.",
			(
				f"Institution demographic baseline: {_safe_json_text(demographics_json)}\n"
				f"Actual response distribution: {_safe_json_text(response_distribution)}\n"
				f"Theme breakdown by age band: {_safe_json_text(theme_age_breakdown)}\n\n"
				"For each age band where representation in responses is more than\n"
				"15 percentage points below their share of the institution:\n\n"
				"Return JSON:\n"
				"{\n"
				'  "underrepresented_groups": [\n'
				"    {\n"
				'      "group": "string",\n'
				'      "institution_share": float,\n'
				'      "response_share": float,\n'
				'      "gap": float,\n'
				'      "affected_themes": ["theme_label"],\n'
				'      "equity_note": "1 sentence plain English explanation"\n'
				"    }\n"
				"  ],\n"
				'  "representation_health": "good|moderate|poor",\n'
				'  "recommendation": "1 sentence"\n'
				"}\n"
				"If no baseline provided, return representation_health: \"unknown\"\n"
				"with a note that baseline demographics were not configured."
			),
		)
	except Exception as exc:
		errors.append(f"CALL_3_MISSING_VOICES_FAILED: {exc}")

	try:
		if client is None:
			raise RuntimeError("OPENAI_API_KEY is not configured")
		briefing_result = _call_openai_json(
			client,
			openai_model,
			"You are a professional civic engagement report writer.",
			(
				"Write a concise council-ready briefing based on:\n"
				f"- Poll question: {poll.question}\n"
				f"- Organisation: {poll.organisation}\n"
				f"- Total responses: {response_count}\n"
				f"- Themes: {_safe_json_text(themes_result)}\n"
				f"- Conflicts: {_safe_json_text(conflicts_result)}\n"
				f"- Missing voices: {_safe_json_text(missing_voices_result)}\n\n"
				"Return JSON:\n"
				"{\n"
				'  "executive_summary": "2-3 sentences",\n'
				'  "key_findings": ["finding 1", "finding 2", "finding 3"],\n'
				'  "trade_offs": ["trade-off 1", "trade-off 2"],\n'
				'  "recommended_next_steps": ["step 1", "step 2"],\n'
				'  "data_caveats": ["caveat 1"]\n'
				"}\n"
				"Tone: formal but accessible. No jargon."
			),
		)
	except Exception as exc:
		errors.append(f"CALL_4_COUNCIL_BRIEFING_FAILED: {exc}")

	used_fallback = False
	if not isinstance(themes_result, dict) or not themes_result.get("themes"):
		(
			themes_result,
			sentiment_result,
			conflicts_result,
			missing_voices_result,
			briefing_result,
		) = _build_fallback_analysis(
			poll=poll,
			responses=responses,
			response_texts=response_texts,
			demographics_json=demographics_json,
			response_distribution=response_distribution,
		)
		warnings.append("Fallback analysis mode was used due to AI provider failures.")
		warnings.extend(errors)
		errors = []
		used_fallback = True

	merged_sentiment = dict(sentiment_result)
	merged_sentiment["council_briefing"] = briefing_result

	saved = _save_analysis(
		db=db,
		poll_id=poll_id,
		themes=themes_result,
		sentiment_summary=merged_sentiment,
		conflicting_viewpoints=conflicts_result,
		missing_voices=missing_voices_result,
	)

	payload = {
		"id": saved.id,
		"poll_id": poll_id,
		"themes": themes_result,
		"sentiment_summary": sentiment_result,
		"conflicting_viewpoints": conflicts_result,
		"missing_voices": missing_voices_result,
		"council_briefing": briefing_result,
		"generated_at": saved.generated_at.isoformat(),
		"mode": "fallback" if used_fallback else "ai",
		"partial": len(errors) > 0,
		"errors": errors,
		"warnings": warnings,
	}

	status_code = 206 if errors else 200
	return JSONResponse(status_code=status_code, content=payload)


@router.get("/{poll_id}/analysis", response_model=AnalysisRead)
def get_analysis(poll_id: str, db: Session = Depends(get_db)) -> Analysis:
	analysis = db.query(Analysis).filter(Analysis.poll_id == poll_id).first()
	if not analysis:
		raise HTTPException(status_code=404, detail="Analysis not found for this poll")
	return analysis


@router.get("/{poll_id}/analytics", response_model=AnalyticsRead)
def get_analytics(poll_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
	poll = db.query(Poll).filter(Poll.id == poll_id).first()
	if not poll:
		raise HTTPException(status_code=404, detail="Poll not found")

	analysis = db.query(Analysis).filter(Analysis.poll_id == poll_id).first()
	if not analysis:
		raise HTTPException(status_code=404, detail="Analysis not found for this poll")

	responses = db.query(Response).filter(Response.poll_id == poll_id).all()
	return _build_analytics_payload(db=db, poll=poll, analysis=analysis, responses=responses)


@router.get("/{poll_id}/reports/student", response_model=StudentReportRead)
def get_student_report(poll_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
	poll = db.query(Poll).filter(Poll.id == poll_id).first()
	if not poll:
		raise HTTPException(status_code=404, detail="Poll not found")

	analysis = db.query(Analysis).filter(Analysis.poll_id == poll_id).first()
	if not analysis:
		raise HTTPException(status_code=404, detail="Analysis not found for this poll")

	responses = db.query(Response).filter(Response.poll_id == poll_id).all()
	analytics = _build_analytics_payload(db=db, poll=poll, analysis=analysis, responses=responses)
	return _build_student_report(analytics)


@router.get("/{poll_id}/reports/institutional", response_model=InstitutionalReportRead)
def get_institutional_report(poll_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
	poll = db.query(Poll).filter(Poll.id == poll_id).first()
	if not poll:
		raise HTTPException(status_code=404, detail="Poll not found")

	analysis = db.query(Analysis).filter(Analysis.poll_id == poll_id).first()
	if not analysis:
		raise HTTPException(status_code=404, detail="Analysis not found for this poll")

	responses = db.query(Response).filter(Response.poll_id == poll_id).all()
	analytics = _build_analytics_payload(db=db, poll=poll, analysis=analysis, responses=responses)
	return _build_institutional_report(analytics)
