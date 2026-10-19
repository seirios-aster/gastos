import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  balanceCents,
  cleanPerson,
  dueText,
  groupByPerson,
  isOverdue,
  isSettled,
  loanReminderTime,
  personKey,
  recentPeople,
  reminderMessage,
  summarizeLoans,
  type Loan,
} from '../loans';

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h).getTime();
const now = d(2026, 10, 20, 15);

let nextId = 1;
const loan = (over: Partial<Loan> = {}): Loan => ({
  id: nextId++,
  person: 'Marco',
  direction: 'lent',
  amountCents: 150000,
  note: '',
  createdAt: d(2026, 10, 1),
  dueAt: null,
  remind: false,
  payments: [],
  ...over,
});
const pay = (id: number, amountCents: number, paidAt = d(2026, 10, 10)) => ({ id, amountCents, paidAt });

describe('balances', () => {
  it('subtracts payments from the amount', () => {
    const l = loan({ payments: [pay(1, 50000), pay(2, 20000)] });
    assert.equal(balanceCents(l), 80000);
    assert.equal(isSettled(l), false);
  });

  it('is settled at zero and never goes negative', () => {
    assert.equal(isSettled(loan({ payments: [pay(1, 150000)] })), true);
    assert.equal(balanceCents(loan({ payments: [pay(1, 999999)] })), 0);
  });
});

describe('names', () => {
  it('cleans spaces and treats spellings as one person', () => {
    assert.equal(cleanPerson('  Marco   Reyes '), 'Marco Reyes');
    assert.equal(personKey(' MARCO  reyes'), personKey('marco reyes'));
    assert.equal(cleanPerson('x'.repeat(100)).length, 40);
  });
});

describe('due dates', () => {
  it('is overdue only after the due day and only while unpaid', () => {
    assert.equal(isOverdue(loan({ dueAt: d(2026, 10, 20, 9) }), now), false);
    assert.equal(isOverdue(loan({ dueAt: d(2026, 10, 19, 9) }), now), true);
    assert.equal(isOverdue(loan({ dueAt: d(2026, 10, 19, 9), payments: [pay(1, 150000)] }), now), false);
    assert.equal(isOverdue(loan({ dueAt: null }), now), false);
  });

  it('words the due state', () => {
    assert.equal(dueText(loan({ dueAt: d(2026, 10, 20) }), now), 'Due today');
    assert.equal(dueText(loan({ dueAt: d(2026, 10, 21) }), now), 'Due tomorrow');
    assert.equal(dueText(loan({ dueAt: d(2026, 10, 19) }), now), '1 day overdue');
    assert.equal(dueText(loan({ dueAt: d(2026, 10, 17) }), now), '3 days overdue');
    assert.equal(dueText(loan({ dueAt: null }), now), null);
    assert.equal(dueText(loan({ dueAt: d(2026, 10, 25), payments: [pay(1, 150000)] }), now), null);
  });

  it('reminds at 9:00 on the due day, only when asked, open and in the future', () => {
    assert.equal(loanReminderTime(loan({ dueAt: d(2026, 10, 25), remind: true }), now), d(2026, 10, 25, 9));
    assert.equal(loanReminderTime(loan({ dueAt: d(2026, 10, 25), remind: false }), now), null);
    assert.equal(loanReminderTime(loan({ dueAt: null, remind: true }), now), null);
    assert.equal(loanReminderTime(loan({ dueAt: d(2026, 10, 20), remind: true }), now), null); // 9:00 already passed
    assert.equal(
      loanReminderTime(loan({ dueAt: d(2026, 10, 25), remind: true, payments: [pay(1, 150000)] }), now),
      null
    );
  });
});

describe('summarizeLoans', () => {
  it('adds up what is open in each direction and skips settled loans', () => {
    const totals = summarizeLoans([
      loan({ amountCents: 100000, payments: [pay(1, 40000)] }),
      loan({ amountCents: 50000 }),
      loan({ direction: 'borrowed', amountCents: 30000 }),
      loan({ amountCents: 20000, payments: [pay(2, 20000)] }),
    ]);
    assert.deepEqual(totals, { owedToYouCents: 110000, youOweCents: 30000, openCount: 3 });
  });

  it('copes with nothing', () => {
    assert.deepEqual(summarizeLoans([]), { owedToYouCents: 0, youOweCents: 0, openCount: 0 });
  });
});

describe('groupByPerson', () => {
  it('groups spellings of a name and nets both directions', () => {
    const groups = groupByPerson(
      [
        loan({ person: 'Marco', amountCents: 150000 }),
        loan({ person: ' marco ', direction: 'borrowed', amountCents: 50000 }),
        loan({ person: 'Ana', direction: 'borrowed', amountCents: 20000 }),
      ],
      now
    );
    const marco = groups.find((g) => g.key === 'marco');
    assert.equal(groups.length, 2);
    assert.equal(marco?.netCents, 100000);
    assert.equal(marco?.loans.length, 2);
    assert.equal(groups.find((g) => g.key === 'ana')?.netCents, -20000);
  });

  it('puts overdue people first, then people with open loans, then settled ones', () => {
    const groups = groupByPerson(
      [
        loan({ person: 'Settled', payments: [pay(1, 150000)], createdAt: d(2026, 10, 19) }),
        loan({ person: 'Recent', createdAt: d(2026, 10, 15) }),
        loan({ person: 'Late', createdAt: d(2026, 9, 1), dueAt: d(2026, 10, 1) }),
      ],
      now
    );
    assert.deepEqual(groups.map((g) => g.person), ['Late', 'Recent', 'Settled']);
    assert.equal(groups[0].overdue, true);
  });

  it('lists open loans before settled ones and finds the nearest due day', () => {
    const [group] = groupByPerson(
      [
        loan({ id: 1, createdAt: d(2026, 10, 5), payments: [pay(1, 150000)] }),
        loan({ id: 2, createdAt: d(2026, 10, 2), dueAt: d(2026, 11, 9) }),
        loan({ id: 3, createdAt: d(2026, 10, 3), dueAt: d(2026, 11, 2) }),
      ],
      now
    );
    assert.deepEqual(group.loans.map((l) => l.id), [3, 2, 1]);
    assert.equal(group.nextDueAt, d(2026, 11, 2));
    assert.equal(group.openCount, 2);
  });

  it('copes with an empty list', () => {
    assert.deepEqual(groupByPerson([], now), []);
  });
});

describe('recentPeople', () => {
  it('lists each name once, most recent first', () => {
    const names = recentPeople([
      loan({ person: 'Ana', createdAt: d(2026, 9, 1) }),
      loan({ person: 'Marco', createdAt: d(2026, 10, 1) }),
      loan({ person: 'ana', createdAt: d(2026, 8, 1) }),
    ]);
    assert.deepEqual(names, ['Marco', 'Ana']);
  });
});

describe('reminderMessage', () => {
  it('writes a message for someone who owes you', () => {
    const [group] = groupByPerson([loan({ note: 'groceries', payments: [pay(1, 50000)] })], now);
    const text = reminderMessage(group, '₱') ?? '';
    assert.match(text, /^Hi Marco!/);
    assert.match(text, /₱1,000\.00 left of ₱1,500\.00/);
    assert.match(text, /for groceries/);
  });

  it('lists several open loans', () => {
    const [group] = groupByPerson([loan({ amountCents: 10000 }), loan({ amountCents: 20000 })], now);
    const text = reminderMessage(group, '₱') ?? '';
    assert.match(text, /still owe me ₱300\.00/);
    assert.equal(text.split('•').length - 1, 2);
  });

  it('has nothing to say when you owe them or it is paid', () => {
    const [owe] = groupByPerson([loan({ direction: 'borrowed' })], now);
    const [paid] = groupByPerson([loan({ payments: [pay(1, 150000)] })], now);
    assert.equal(reminderMessage(owe, '₱'), null);
    assert.equal(reminderMessage(paid, '₱'), null);
  });
});
