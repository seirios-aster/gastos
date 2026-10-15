import { daysInMonth } from './dates';

export type BudgetTone = 'ok' | 'warn' | 'over';

export type BudgetStatus = {
  /** 0..1, how much of the budget is used (capped at 1 for drawing the bar). */
  ratio: number;
  /** Positive when money is left, negative when over budget. */
  remainingCents: number;
  tone: BudgetTone;
};

export function budgetStatus(spentCents: number, budgetCents: number): BudgetStatus {
  const ratio = budgetCents > 0 ? spentCents / budgetCents : 0;
  return {
    ratio: Math.min(ratio, 1),
    remainingCents: budgetCents - spentCents,
    tone: spentCents > budgetCents ? 'over' : ratio >= 0.8 ? 'warn' : 'ok',
  };
}

/** What you can still spend per day for the rest of the month (today included). */
export function dailyAllowanceCents(remainingCents: number, now: number): number {
  if (remainingCents <= 0) return 0;
  const daysLeft = daysInMonth(now) - new Date(now).getDate() + 1;
  return Math.floor(remainingCents / daysLeft);
}
