// Regras de cálculo de metas — centralizadas aqui para serem usadas
// tanto no dashboard da profissional quanto no dashboard master.
//
// A partir da v2, os cálculos de média/ritmo/projeção consideram apenas
// DIAS TRABALHÁVEIS (não todos os dias do calendário). Por padrão,
// domingos e segundas-feiras são bloqueados; isso pode ser sobrescrito
// manualmente por dia (ver WorkdayOverrides).

export type WorkdayOverrides = Record<string, boolean>; // 'YYYY-MM-DD' -> true (liberado) | false (bloqueado)

export function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

/** Dia atual do mês (1-indexed). Para meses passados, considera o mês todo decorrido;
 * para meses futuros, considera 0 dias decorridos. */
export function currentDayOfMonth(month: number, year: number) {
  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
  if (isCurrentMonth) return now.getDate();
  const total = daysInMonth(month, year);
  const isFuture =
    year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
  return isFuture ? 0 : total;
}

export function daysRemaining(month: number, year: number) {
  const total = daysInMonth(month, year);
  const elapsed = currentDayOfMonth(month, year);
  return Math.max(total - elapsed, 0);
}

/** Formata uma Date local como 'YYYY-MM-DD' (sem depender de fuso/UTC). */
export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Regra padrão: domingo (0) e segunda (1) são bloqueados; demais dias são trabalháveis. */
export function isDefaultWorkday(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 1;
}

/** Considera exceções manuais (work_days) por cima da regra padrão. */
export function isWorkableDay(date: Date, overrides: WorkdayOverrides) {
  const key = toDateKey(date);
  if (key in overrides) return overrides[key];
  return isDefaultWorkday(date);
}

export function totalWorkableDaysInMonth(month: number, year: number, overrides: WorkdayOverrides) {
  const total = daysInMonth(month, year);
  let count = 0;
  for (let d = 1; d <= total; d++) {
    if (isWorkableDay(new Date(year, month - 1, d), overrides)) count++;
  }
  return count;
}

/** Dias trabalháveis já decorridos (do dia 1 até hoje, inclusive). */
export function workableDaysElapsed(month: number, year: number, overrides: WorkdayOverrides) {
  const today = currentDayOfMonth(month, year);
  let count = 0;
  for (let d = 1; d <= today; d++) {
    if (isWorkableDay(new Date(year, month - 1, d), overrides)) count++;
  }
  return count;
}

/** Dias trabalháveis que ainda restam (depois de hoje até o fim do mês). */
export function workableDaysRemaining(month: number, year: number, overrides: WorkdayOverrides) {
  const total = daysInMonth(month, year);
  const today = currentDayOfMonth(month, year);
  let count = 0;
  for (let d = today + 1; d <= total; d++) {
    if (isWorkableDay(new Date(year, month - 1, d), overrides)) count++;
  }
  return count;
}

export function weeksRemainingFromWorkableDays(workableDays: number) {
  // ~6 dias trabalháveis por semana (considerando 1 dia de folga fixo)
  return Math.max(Math.ceil(workableDays / 6), workableDays > 0 ? 1 : 0);
}

export function percent(amountDone: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return Math.round((amountDone / goal) * 1000) / 10; // 1 casa decimal
}

export function remaining(amountDone: number, goal: number) {
  return Math.max(goal - amountDone, 0);
}

/** Média diária necessária, considerando apenas os dias TRABALHÁVEIS restantes. */
export function dailyAverageNeeded(
  amountDone: number,
  goal: number,
  month: number,
  year: number,
  overrides: WorkdayOverrides
) {
  const rem = remaining(amountDone, goal);
  const workableDays = workableDaysRemaining(month, year, overrides);
  if (workableDays <= 0) return rem > 0 ? rem : 0;
  return Math.round((rem / workableDays) * 100) / 100;
}

/** Média semanal necessária, considerando dias trabalháveis restantes. */
export function weeklyAverageNeeded(
  amountDone: number,
  goal: number,
  month: number,
  year: number,
  overrides: WorkdayOverrides
) {
  const rem = remaining(amountDone, goal);
  const workableDays = workableDaysRemaining(month, year, overrides);
  const weeks = weeksRemainingFromWorkableDays(workableDays);
  if (weeks <= 0) return rem;
  return Math.round((rem / weeks) * 100) / 100;
}

/** Projeção de fechamento do mês, com base no ritmo médio por dia TRABALHÁVEL já decorrido. */
export function projection(amountDone: number, month: number, year: number, overrides: WorkdayOverrides) {
  const elapsedWorkable = workableDaysElapsed(month, year, overrides);
  const totalWorkable = totalWorkableDaysInMonth(month, year, overrides);
  if (elapsedWorkable <= 0) return amountDone;
  const dailyAvgDone = amountDone / elapsedWorkable;
  return Math.round(dailyAvgDone * totalWorkable * 100) / 100;
}

/** Status de ritmo: compara o % já realizado da meta geral com o % esperado
 * para os dias TRABALHÁVEIS já decorridos no mês. */
export function rhythmStatus(
  amountDone: number,
  generalGoal: number,
  month: number,
  year: number,
  overrides: WorkdayOverrides
): "abaixo" | "dentro" | "acima" {
  const elapsedWorkable = workableDaysElapsed(month, year, overrides);
  const totalWorkable = totalWorkableDaysInMonth(month, year, overrides);
  const expectedPct = totalWorkable > 0 ? (elapsedWorkable / totalWorkable) * 100 : 0;
  const actualPct = percent(amountDone, generalGoal);

  const diff = actualPct - expectedPct;
  const TOLERANCE = 5; // pontos percentuais de tolerância para "dentro do ritmo"

  if (diff < -TOLERANCE) return "abaixo";
  if (diff > TOLERANCE) return "acima";
  return "dentro";
}

/** Divide um valor total igualmente entre N dias, ajustando o último dia
 * para que a soma bata exatamente com o total (evita perda de centavos). */
export function splitAmountAcrossDays(total: number, days: number): number[] {
  if (days <= 0) return [];
  const base = Math.floor((total / days) * 100) / 100;
  const amounts = new Array(days).fill(base);
  const distributed = base * days;
  const remainder = Math.round((total - distributed) * 100) / 100;
  amounts[amounts.length - 1] = Math.round((amounts[amounts.length - 1] + remainder) * 100) / 100;
  return amounts;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPct(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Agrupa uma lista de lançamentos diários em buckets de semana do mês (1 a 5). */
export function weekBucketOfMonth(dateStr: string): number {
  const day = Number(dateStr.slice(8, 10));
  return Math.min(Math.ceil(day / 7), 5);
}
