export type Role = "master" | "profissional";
export type Theme = "light" | "dark";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  professional_id: string | null;
  theme: Theme;
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

export interface DailyEntry {
  id: string;
  professional_id: string;
  entry_date: string; // 'YYYY-MM-DD'
  month: number;
  year: number;
  amount: number;
  observation: string | null;
  created_by: string | null;
  created_by_role: string | null;
}

export interface WorkDayOverride {
  id: string;
  professional_id: string;
  work_date: string; // 'YYYY-MM-DD'
  is_working_day: boolean;
}

export interface RankingRow {
  professional_id: string;
  name: string;
  pct_general: number;
  pct_initial: number;
}

export type RhythmStatus = "abaixo" | "dentro" | "acima";
