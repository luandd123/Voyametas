export type Role = "master" | "profissional";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  professional_id: string | null;
}

export interface Professional {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface MonthlyGoal {
  id: string;
  professional_id: string;
  month: number;
  year: number;
  initial_goal: number;
  general_goal: number;
}

export interface GoalProgress {
  id: string;
  professional_id: string;
  month: number;
  year: number;
  amount_done: number;
}

export interface MonthLock {
  id: string;
  month: number;
  year: number;
  is_unlocked: boolean;
}

export interface RankingRow {
  professional_id: string;
  name: string;
  pct_general: number;
  pct_initial: number;
}

export type RhythmStatus = "abaixo" | "dentro" | "acima";
