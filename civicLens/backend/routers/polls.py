import base64
import io
import os
from uuid import uuid4

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import Analysis, Poll, Response, get_db
from models.schemas import PollBaselineUpdate, PollCreate, PollCreateResponse, PollRead, ResponseCreate, ResponseStats, ResponseTokenOut, TokenOutcome

router = APIRouter(prefix="/polls", tags=["polls"])


def _qr_base64_for_poll(poll_id: str) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    poll_url = f"{frontend_url.rstrip('/')}/poll/{poll_id}"
    image = qrcode.make(poll_url)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


@router.get("/", response_model=list[PollRead])
def list_polls(db: Session = Depends(get_db)) -> list[Poll]:
    return db.query(Poll).order_by(Poll.created_at.desc()).all()


@router.get("/{poll_id}", response_model=PollRead)
def get_poll(poll_id: str, db: Session = Depends(get_db)) -> Poll:
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll


@router.post("/", response_model=PollCreateResponse, status_code=201)
def create_poll(payload: PollCreate, db: Session = Depends(get_db)) -> PollCreateResponse:
    if payload.mode == "under16" and not payload.under16_consent_confirmed:
        raise HTTPException(
            status_code=422,
            detail="Under-16 mode requires institutional consent confirmation",
        )

    poll = Poll(
        title=payload.title,
        question=payload.question,
        organisation=payload.organisation,
        mode=payload.mode,
        institution_demographics=payload.institution_demographics,
        under16_consent_confirmed=payload.under16_consent_confirmed,
        is_active=payload.is_active,
    )
    db.add(poll)
    db.commit()
    db.refresh(poll)

    return PollCreateResponse(poll=poll, qr_code_base64=_qr_base64_for_poll(poll.id))


@router.patch("/{poll_id}/baseline", response_model=PollRead)
def update_poll_baseline(
    poll_id: str, payload: PollBaselineUpdate, db: Session = Depends(get_db)
) -> Poll:
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    poll.institution_demographics = payload.institution_demographics
    db.add(poll)
    db.commit()
    db.refresh(poll)
    return poll


@router.post("/{poll_id}/respond", response_model=ResponseTokenOut)
def submit_response(poll_id: str, payload: ResponseCreate, db: Session = Depends(get_db)) -> ResponseTokenOut:
    poll = db.query(Poll).filter(Poll.id == poll_id, Poll.is_active.is_(True)).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found or inactive")

    token = str(uuid4())
    response = Response(
        poll_id=poll_id,
        nickname=payload.nickname,
        age_band=payload.age_band,
        group_tag=payload.group_tag,
        response_text=payload.response_text,
        follow_up_token=token,
    )
    db.add(response)
    db.commit()

    return ResponseTokenOut(follow_up_token=token)


@router.get("/{poll_id}/responses", response_model=ResponseStats)
def get_response_stats(poll_id: str, db: Session = Depends(get_db)) -> ResponseStats:
    poll_exists = db.query(Poll.id).filter(Poll.id == poll_id).first()
    if not poll_exists:
        raise HTTPException(status_code=404, detail="Poll not found")

    responses = db.query(Response).filter(Response.poll_id == poll_id).all()
    distribution = {
        "16-17": 0,
        "18-21": 0,
        "22-25": 0,
        "25+": 0,
    }

    for item in responses:
        if item.age_band in distribution:
            distribution[item.age_band] += 1

    latest_response = max((item.submitted_at for item in responses), default=None)
    return ResponseStats(
        response_count=len(responses),
        age_band_distribution=distribution,
        last_response_at=latest_response,
    )


@router.get("/{poll_id}/token/{token}", response_model=TokenOutcome)
def get_token_outcome(poll_id: str, token: str, db: Session = Depends(get_db)) -> TokenOutcome:
    response = (
        db.query(Response)
        .filter(Response.poll_id == poll_id, Response.follow_up_token == token)
        .first()
    )
    if not response:
        raise HTTPException(status_code=404, detail="Token not found for this poll")

    analysis = db.query(Analysis).filter(Analysis.poll_id == poll_id).first()
    if not analysis:
        return TokenOutcome(
            themes_summary="Analysis pending",
            decision_made=False,
            decision_text="No decision has been recorded yet.",
            influenced_by_input=False,
        )

    themes_summary = "Themes recorded"
    if isinstance(analysis.themes, dict) and analysis.themes:
        themes_summary = ", ".join(list(analysis.themes.keys())[:3])
    elif isinstance(analysis.themes, list) and analysis.themes:
        themes_summary = ", ".join(str(item) for item in analysis.themes[:3])

    sentiment = analysis.sentiment_summary if isinstance(analysis.sentiment_summary, dict) else {}
    decision_made = bool(sentiment.get("decision_made", False))
    decision_text = str(sentiment.get("decision_text", "No decision has been recorded yet."))
    influenced_by_input = bool(sentiment.get("influenced_by_input", False))

    return TokenOutcome(
        themes_summary=themes_summary,
        decision_made=decision_made,
        decision_text=decision_text,
        influenced_by_input=influenced_by_input,
    )
