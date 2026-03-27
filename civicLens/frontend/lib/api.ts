export type Poll = {
  id: string;
  title: string;
  question: string;
  organisation: string;
  mode: "standard" | "under16";
  institution_demographics: Record<string, number>;
  under16_consent_confirmed: boolean;
  is_active: boolean;
  created_at: string;
};

export type ResponsePayload = {
  nickname?: string;
  age_band?: "16-17" | "18-21" | "22-25" | "25+";
  group_tag?: string;
  response_text: string;
};

export type ResponseToken = {
  follow_up_token: string;
};

export type ResponseStats = {
  response_count: number;
  age_band_distribution: Record<string, number>;
  last_response_at?: string | null;
};

export type AnalysisBreakdown = {
  id: string;
  label: string;
  response_count: number;
  percentage: number;
  representative_quotes?: string[];
  age_band_breakdown?: Record<string, number>;
};

export type Analysis = {
  id: string;
  poll_id: string;
  themes: {
    themes: AnalysisBreakdown[];
  };
  sentiment_summary: Record<string, unknown>;
  conflicting_viewpoints: Array<Record<string, unknown>>;
  missing_voices: Record<string, unknown>;
  generated_at: string;
};

export type Analytics = {
  poll_id: string;
  generated_at: string;
  participation: {
    total_responses: number;
    responses_per_age_band: Record<string, number>;
    responses_per_group: Record<string, number>;
  };
  top_themes: AnalysisBreakdown[];
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trend_indicators: {
    compared_poll_id: string | null;
    response_delta: number;
    response_delta_pct: number;
    top_theme_changed: boolean;
  };
  conflicting_viewpoints: Array<Record<string, unknown>>;
  missing_voices: Record<string, unknown>;
  impact: {
    summary: string;
    affected_groups: string[];
    trade_offs: string[];
  };
};

export type StudentReport = {
  poll_id: string;
  generated_at: string;
  what_students_said: string;
  top_themes: Array<{ theme: string; key_insight: string; quote: string }>;
  sentiment_summary: string;
  transparency_note: string;
};

export type InstitutionalReport = {
  poll_id: string;
  generated_at: string;
  executive_summary: string;
  key_themes: AnalysisBreakdown[];
  demographic_breakdown: {
    responses_per_age_band: Record<string, number>;
    responses_per_group: Record<string, number>;
  };
  conflicting_viewpoints: Array<Record<string, unknown>>;
  missing_voices: Record<string, unknown>;
  suggested_considerations: string[];
};

export type TokenOutcome = {
  themes_summary: string;
  decision_made: boolean;
  decision_text: string;
  influenced_by_input: boolean;
};

export type PollCreatePayload = {
  title: string;
  question: string;
  organisation: string;
  mode: "standard" | "under16";
  institution_demographics: Record<string, number>;
  under16_consent_confirmed: boolean;
  is_active?: boolean;
};

export type PollCreateResult = {
  poll: Poll;
  qr_code_base64: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }

  return (await res.json()) as T;
}

export function fetchPolls(): Promise<Poll[]> {
  return request<Poll[]>("/polls");
}

export function fetchPoll(id: string | number): Promise<Poll> {
  return request<Poll>(`/polls/${id}`);
}

export function submitResponse(pollId: string | number, payload: ResponsePayload): Promise<ResponseToken> {
  return request<ResponseToken>(`/polls/${pollId}/respond`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchResponseStats(id: string | number): Promise<ResponseStats> {
  return request<ResponseStats>(`/polls/${id}/responses`);
}

export function fetchAnalysis(id: string | number): Promise<Analysis> {
  return request<Analysis>(`/polls/${id}/analysis`);
}

export function analysePoll(id: string | number): Promise<unknown> {
  return request(`/polls/${id}/analyse`, {
    method: "POST",
  });
}

export function fetchAnalytics(id: string | number): Promise<Analytics> {
  return request<Analytics>(`/polls/${id}/analytics`);
}

export function fetchStudentReport(id: string | number): Promise<StudentReport> {
  return request<StudentReport>(`/polls/${id}/reports/student`);
}

export function fetchInstitutionalReport(id: string | number): Promise<InstitutionalReport> {
  return request<InstitutionalReport>(`/polls/${id}/reports/institutional`);
}

export function fetchTokenOutcome(
  pollId: string | number,
  token: string
): Promise<TokenOutcome> {
  return request<TokenOutcome>(`/polls/${pollId}/token/${encodeURIComponent(token)}`);
}

export function createPoll(payload: PollCreatePayload): Promise<PollCreateResult> {
  return request<PollCreateResult>("/polls/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePollBaseline(
  pollId: string | number,
  institution_demographics: Record<string, number>
): Promise<Poll> {
  return request<Poll>(`/polls/${pollId}/baseline`, {
    method: "PATCH",
    body: JSON.stringify({ institution_demographics }),
  });
}
