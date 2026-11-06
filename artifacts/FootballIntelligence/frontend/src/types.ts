export interface Fixture {
  id: string;
  competition: string;
  season: string | null;
  kickoff_utc: string | null;
  home_team: string;
  away_team: string;
  home_goals: number | null;
  away_goals: number | null;
  source: string;
  created_at?: string | null;
}

export interface FixtureCreate {
  id: string;
  competition: string;
  season?: string | null;
  kickoff_utc?: string | null;
  home_team: string;
  away_team: string;
  source?: string;
}

export interface Prediction {
  id?: number | null;
  fixture_id: string;
  model_version: string;
  predicted_at?: string | null;
  home_xg: number;
  away_xg: number;
  home_win: number;
  draw: number;
  away_win: number;
  over_2_5: number;
  btts_yes: number;
  score_matrix?: number[][] | null;
  most_likely_score?: string | null;
  top_scores?: { score: string; probability: number }[];
  most_likely_prob?: number;
  rho?: number;
}

export interface PredictRequest {
  home_xg: number;
  away_xg: number;
  rho?: number | null;
}

export interface Health {
  status: string;
  environment: string;
  model_version: string;
}

export interface TopScore {
  score: string;
  probability: number;
}
