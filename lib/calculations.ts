// Regras de cálculo de metas — centralizadas aqui para serem usadas
// tanto no dashboard da profissional quanto no dashboard master.

export function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

/** Dia atual do mês (1-indexed). Se o mês/ano consultado não for o atual,
 * considera o mês como totalmente decorrido (útil para meses passados no histórico). */
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

export function weeksRemaining(month: number, year: number) {
  const remaining = daysRemaining(month, year);
  return Math.max(Math.ceil(remaining / 7), 1);
}

export function percent(amountDone: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return Math.round((amountDone / goal) * 1000) / 10; // 1 casa decimal
}

export function remaining(amountDone: number, goal: number) {
  return Math.max(goal - amountDone, 0);
}

export function dailyAverageNeeded(amountDone: number, goal: number, month: number, year: number) {
  const rem = remaining(amountDone, goal);
  const days = daysRemaining(month, year);
  if (days <= 0) return rem > 0 ? rem : 0;
  return Math.round((rem / days) * 100) / 100;
}

export function weeklyAverageNeeded(amountDone: number, goal: number, month: number, year: number) {
  const rem = remaining(amountDone, goal);
  const weeks = weeksRemaining(month, year);
  return Math.round((rem / weeks) * 100) / 100;
}

/** Projeção de fechamento do mês, com base no ritmo médio diário realizado até agora. */
export function projection(amountDone: number, month: number, year: number) {
  const elapsed = currentDayOfMonth(month, year);
  const total = daysInMonth(month, year);
  if (elapsed <= 0) return 0;
  const dailyAvgDone = amountDone / elapsed;
  return Math.round(dailyAvgDone * total * 100) / 100;
}

/** Status de ritmo comparando % realizado da meta geral com o % esperado para o dia atual. */
export function rhythmStatus(
  amountDone: number,
  generalGoal: number,
  month: number,
  year: number
): "abaixo" | "dentro" | "acima" {
  const elapsed = currentDayOfMonth(month, year);
  const total = daysInMonth(month, year);
  const expectedPct = total > 0 ? (elapsed / total) * 100 : 0;
  const actualPct = percent(amountDone, generalGoal);

  const diff = actualPct - expectedPct;
  const TOLERANCE = 5; // pontos percentuais de tolerância para "dentro do ritmo"

  if (diff < -TOLERANCE) return "abaixo";
  if (diff > TOLERANCE) return "acima";
  return "dentro";
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
