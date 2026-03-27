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
