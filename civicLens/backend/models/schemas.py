from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


ModeType = Literal["standard", "under16"]
AgeBandType = Literal["16-17", "18-21", "22-25", "25+"]


class PollBase(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    question: str = Field(min_length=5, max_length=2000)
    organisation: str = Field(min_length=2, max_length=200)
    mode: ModeType
    institution_demographics: dict[str, int]
    under16_consent_confirmed: bool = False
    is_active: bool = True


class PollCreate(PollBase):
    pass


class PollBaselineUpdate(BaseModel):
    institution_demographics: dict[str, int]


class PollRead(PollBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PollCreateResponse(BaseModel):
    poll: PollRead
    qr_code_base64: str


class ResponseCreate(BaseModel):
    nickname: str | None = Field(default=None, max_length=80)
    age_band: AgeBandType | None = None
    group_tag: str | None = Field(default=None, max_length=40)
    response_text: str = Field(min_length=1, max_length=4000)


class ResponseTokenOut(BaseModel):
    follow_up_token: str


class ResponseStats(BaseModel):
    response_count: int
    age_band_distribution: dict[str, int]
    last_response_at: datetime | None = None


class TokenOutcome(BaseModel):
    themes_summary: str
    decision_made: bool
    decision_text: str
    influenced_by_input: bool


class AnalysisRead(BaseModel):
    id: str
    poll_id: str
    themes: Any
    sentiment_summary: Any
    conflicting_viewpoints: Any
    missing_voices: Any
    generated_at: datetime

    class Config:
        from_attributes = True


class ParticipationMetrics(BaseModel):
    total_responses: int
    responses_per_age_band: dict[str, int]
    responses_per_group: dict[str, int]


class TrendIndicators(BaseModel):
    compared_poll_id: str | None = None
    response_delta: int = 0
    response_delta_pct: float = 0.0
    top_theme_changed: bool = False


class ImpactInsight(BaseModel):
    summary: str
    affected_groups: list[str]
    trade_offs: list[str]


class AnalyticsRead(BaseModel):
    poll_id: str
    generated_at: datetime
    participation: ParticipationMetrics
    top_themes: list[dict[str, Any]]
    sentiment_distribution: dict[str, float]
    trend_indicators: TrendIndicators
    conflicting_viewpoints: list[dict[str, Any]]
    missing_voices: dict[str, Any]
    impact: ImpactInsight


class StudentThemeItem(BaseModel):
    theme: str
    key_insight: str
    quote: str


class StudentReportRead(BaseModel):
    poll_id: str
    generated_at: datetime
    what_students_said: str
    top_themes: list[StudentThemeItem]
    sentiment_summary: str
    transparency_note: str


class InstitutionalReportRead(BaseModel):
    poll_id: str
    generated_at: datetime
    executive_summary: str
    key_themes: list[dict[str, Any]]
    demographic_breakdown: dict[str, Any]
    conflicting_viewpoints: list[dict[str, Any]]
    missing_voices: dict[str, Any]
    suggested_considerations: list[str]
