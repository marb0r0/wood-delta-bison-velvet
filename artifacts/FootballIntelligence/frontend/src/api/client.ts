import type { Fixture, FixtureCreate, Health, Prediction, PredictRequest } from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<Health>("/health"),

  listFixtures: (limit = 50) => request<Fixture[]>(`/api/v1/fixtures?limit=${limit}`),
  getFixture: (id: string) => request<Fixture>(`/api/v1/fixtures/${id}`),
  createFixture: (data: FixtureCreate) =>
    request<Fixture>("/api/v1/fixtures", { method: "POST", body: JSON.stringify(data) }),
  deleteFixture: (id: string) => request<void>(`/api/v1/fixtures/${id}`, { method: "DELETE" }),
  predict: (fixtureId: string, body: PredictRequest) =>
    request<Prediction>(`/api/v1/fixtures/${fixtureId}/predict`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  quickPredict: (body: PredictRequest) =>
    request<Prediction & { top_scores?: { score: string; probability: number }[] }>(
      "/api/v1/predict/quick",
      { method: "POST", body: JSON.stringify(body) }
    ),
  predictionHistory: (fixtureId: string) =>
    request<Prediction[]>(`/api/v1/fixtures/${fixtureId}/predictions`),
  latestPredictions: (limit = 20) =>
    request<Prediction[]>(`/api/v1/predictions/latest?limit=${limit}`),

  liveStatus: () => request<Record<string, unknown>>("/api/v1/live/status"),
  liveBoard: () =>
    request<{ count: number; matches: Record<string, unknown>[]; errors: Record<string, string> }>(
      "/api/v1/live/board"
    ),
  prematchBoard: (date?: string) =>
    request<{ count: number; matches: Record<string, unknown>[]; errors: Record<string, string> }>(
      `/api/v1/live/prematch${date ? `?date=${encodeURIComponent(date)}` : ""}`
    ),
  hubPredict: (body: {
    home_team: string;
    away_team: string;
    home_team_id?: string;
    away_team_id?: string;
    home_xg?: number;
    away_xg?: number;
  }) => request<Record<string, unknown>>("/api/v1/live/predict", { method: "POST", body: JSON.stringify(body) }),

  liveSchedule: (date?: string) =>
    request<{ date?: string; events: Record<string, unknown>[] }>(
      `/api/v1/live/schedule${date ? `?date=${encodeURIComponent(date)}` : ""}`
    ),
  liveCompetitions: () =>
    request<{ competitions: Record<string, unknown>[] }>("/api/v1/live/competitions"),
  liveImportSchedule: (date?: string, competition?: string) => {
    const q = new URLSearchParams();
    if (date) q.set("date", date);
    if (competition) q.set("competition", competition);
    const qs = q.toString();
    return request<{ created: number; updated: number }>(
      `/api/v1/live/import-schedule${qs ? `?${qs}` : ""}`,
      { method: "POST" }
    );
  },
  liveXgEstimate: (homeTeamId: string, awayTeamId: string) =>
    request<{ home_xg: number; away_xg: number; method: string }>(
      `/api/v1/live/xg-estimate?home_team_id=${encodeURIComponent(homeTeamId)}&away_team_id=${encodeURIComponent(awayTeamId)}`
    ),
};
