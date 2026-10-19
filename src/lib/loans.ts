import { daysBetween, shortDateLabel, startOfDay } from './dates';
import { formatMoney } from './money';

/** Money you lent (someone owes you) or borrowed (you owe someone). */
export type Direction = 'lent' | 'borrowed';

export type Payment = {
  id: number;
  amountCents: number;
  /** When it was paid back (ms). */
  paidAt: number;
};

export type Loan = {
  id: number;
  person: string;
  direction: Direction;
  /** The full amount that changed hands. */
  amountCents: number;
  note: string;
  /** The day the money was lent or borrowed (ms). */
  createdAt: number;
  /** The day it should be paid back, or null when there is no deadline. */
  dueAt: number | null;
  /** Remind on the due day. Ignored when there is no due date. */
  remind: boolean;
  payments: Payment[];
};

export type LoanInput = Omit<Loan, 'id' | 'payments'>;

export const MAX_PERSON_LENGTH = 40;

/** Loans are reminded at 9:00 local time on the due day, like recurring expenses. */
const REMIND_HOUR = 9;

/** A name as typed, with stray spaces removed and cut to a sensible length. */
export function cleanPerson(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_PERSON_LENGTH);
}

/** Two spellings of the same name ("marco", " Marco ") are one person. */
export function personKey(name: string): string {
  return cleanPerson(name).toLowerCase();
}

export function paidCents(loan: Pick<Loan, 'payments'>): number {
  return loan.payments.reduce((sum, p) => sum + p.amountCents, 0);
}

/** What is still unpaid; never below zero. */
export function balanceCents(loan: Pick<Loan, 'amountCents' | 'payments'>): number {
  return Math.max(0, loan.amountCents - paidCents(loan));
}

export function isSettled(loan: Pick<Loan, 'amountCents' | 'payments'>): boolean {
  return balanceCents(loan) === 0;
}

/** Past its due day and still not fully paid. The due day itself is not overdue yet. */
export function isOverdue(loan: Loan, now: number): boolean {
  return loan.dueAt !== null && !isSettled(loan) && startOfDay(loan.dueAt) < startOfDay(now);
}

export type LoanTotals = {
  /** Still owed to you across everyone. */
  owedToYouCents: number;
  /** Still owed by you across everyone. */
  youOweCents: number;
  /** How many loans are not fully paid yet. */
  openCount: number;
};

export function summarizeLoans(loans: readonly Loan[]): LoanTotals {
  const totals: LoanTotals = { owedToYouCents: 0, youOweCents: 0, openCount: 0 };
  for (const loan of loans) {
    const balance = balanceCents(loan);
    if (balance === 0) continue;
    totals.openCount++;
    if (loan.direction === 'lent') totals.owedToYouCents += balance;
    else totals.youOweCents += balance;
  }
  return totals;
}

export type PersonGroup = {
  key: string;
  /** The name as it was last typed. */
  person: string;
  /** Positive: they owe you. Negative: you owe them. Both directions are netted. */
  netCents: number;
  /** Their loans, open ones first, then newest first. */
  loans: Loan[];
  openCount: number;
  /** The nearest due day among their open loans, or null. */
  nextDueAt: number | null;
  overdue: boolean;
  /** The latest of any loan date or payment (ms), for ordering. */
  lastActivity: number;
};

function lastActivityOf(loan: Loan): number {
  return Math.max(loan.createdAt, ...loan.payments.map((p) => p.paidAt));
}

/** One entry per person, people with something open first (overdue ones on top), then by recent activity. */
export function groupByPerson(loans: readonly Loan[], now: number): PersonGroup[] {
  const groups = new Map<string, PersonGroup>();

  // Newest first, so each person's display name is the latest spelling.
  const ordered = [...loans].sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  for (const loan of ordered) {
    const key = personKey(loan.person);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        person: cleanPerson(loan.person),
        netCents: 0,
        loans: [],
        openCount: 0,
        nextDueAt: null,
        overdue: false,
        lastActivity: 0,
      };
      groups.set(key, group);
    }
    group.loans.push(loan);
    group.lastActivity = Math.max(group.lastActivity, lastActivityOf(loan));
    const balance = balanceCents(loan);
    if (balance === 0) continue;
    group.openCount++;
    group.netCents += loan.direction === 'lent' ? balance : -balance;
    if (loan.dueAt !== null && (group.nextDueAt === null || loan.dueAt < group.nextDueAt)) {
      group.nextDueAt = loan.dueAt;
    }
    if (isOverdue(loan, now)) group.overdue = true;
  }

  for (const group of groups.values()) {
    group.loans.sort(
      (a, b) =>
        Number(isSettled(a)) - Number(isSettled(b)) || b.createdAt - a.createdAt || b.id - a.id
    );
  }

  return [...groups.values()].sort(
    (a, b) =>
      Number(b.openCount > 0) - Number(a.openCount > 0) ||
      Number(b.overdue) - Number(a.overdue) ||
      b.lastActivity - a.lastActivity ||
      a.person.localeCompare(b.person)
  );
}

/** Names used before, most recently used first, for quick picking when adding a loan. */
export function recentPeople(loans: readonly Loan[], limit = 8): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  const ordered = [...loans].sort((a, b) => lastActivityOf(b) - lastActivityOf(a) || b.id - a.id);
  for (const loan of ordered) {
    const key = personKey(loan.person);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(cleanPerson(loan.person));
    if (names.length >= limit) break;
  }
  return names;
}

/** When to remind about this loan: 9:00 on its due day, or null if there is nothing to remind about. */
export function loanReminderTime(loan: Loan, now: number): number | null {
  if (!loan.remind || loan.dueAt === null || isSettled(loan)) return null;
  const due = new Date(loan.dueAt);
  const at = new Date(due.getFullYear(), due.getMonth(), due.getDate(), REMIND_HOUR).getTime();
  return at > now ? at : null;
}

/** "Due today", "Due tomorrow", "Due Nov 3" or "3 days overdue", for a loan that is not settled. */
export function dueText(loan: Loan, now: number): string | null {
  if (loan.dueAt === null || isSettled(loan)) return null;
  const days = daysBetween(now, loan.dueAt);
  if (days < 0) return days === -1 ? '1 day overdue' : `${-days} days overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due ${shortDateLabel(loan.dueAt)}`;
}

/**
 * A friendly message to send someone who owes you, listing what is still open. Null when they
 * owe you nothing (or you owe them).
 */
export function reminderMessage(group: PersonGroup, currency: string): string | null {
  if (group.netCents <= 0) return null;
  const open = group.loans.filter((loan) => loan.direction === 'lent' && !isSettled(loan));
  if (open.length === 0) return null;

  const lines = open.map((loan) => {
    const left = formatMoney(balanceCents(loan), currency);
    const detail =
      paidCents(loan) > 0 ? `${left} left of ${formatMoney(loan.amountCents, currency)}` : left;
    const what = loan.note ? ` for ${loan.note}` : '';
    return `${detail}, from ${shortDateLabel(loan.createdAt)}${what}`;
  });
  const owed = formatMoney(
    open.reduce((sum, loan) => sum + balanceCents(loan), 0),
    currency
  );
  return open.length === 1
    ? `Hi ${group.person}! A friendly reminder about the money I lent you: ${lines[0]}. Thank you!`
    : `Hi ${group.person}! A friendly reminder that you still owe me ${owed}:\n${lines
        .map((line) => `• ${line}`)
        .join('\n')}\nThank you!`;
}
