import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDays, daysInMonth } from '../dates';
import {
  categoryTotals,
  dailyTotals,
  DEFAULT_CATEGORIES,
  expensesInMonth,
  expensesOnDay,
  getCategory,
  groupByDay,
  monthlyTotals,
  searchExpenses,
  sortExpenses,
  sumCents,
  toCsv,
  toCsvFile,
  type Category,
  type Expense,
} from '../expenses';

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h).getTime();
const mk = (id: number, amountCents: number, createdAt: number, category = 'food', title = ''): Expense => ({
  id,
  amountCents,
  createdAt,
  category,
  title,
});
const cats: Category[] = [...DEFAULT_CATEGORIES, { id: 'c_pets', label: 'Pets', emoji: '🐶' }];
const now = new Date(2026, 9, 15, 14, 30).getTime();

describe('listing', () => {
  const list = sortExpenses([
    mk(1, 500, addDays(now, -1)),
    mk(2, 1000, now),
    mk(3, 250, now - 3600_000, 'transport'),
    mk(4, 100, addDays(now, -40), 'bills'),
  ]);

  it('sorts newest first', () => {
    assert.deepEqual(list.map((e) => e.id), [2, 3, 1, 4]);
  });

  it('breaks ties by id', () => {
    assert.deepEqual(sortExpenses([mk(1, 1, 5), mk(2, 1, 5)]).map((e) => e.id), [2, 1]);
  });

  it('groups by day with totals', () => {
    const groups = groupByDay(list, now);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].label, 'Today');
    assert.equal(groups[0].totalCents, 1250);
    assert.equal(groups[1].label, 'Yesterday');
  });

  it('sums and filters', () => {
    assert.equal(sumCents(list), 1850);
    assert.equal(expensesOnDay(list, now).length, 2);
    assert.equal(expensesInMonth(list, now).length, 3);
  });

  it('shares sum to one', () => {
    const totals = categoryTotals(expensesInMonth(list, now), DEFAULT_CATEGORIES);
    assert.equal(totals[0].category.id, 'food');
    assert.ok(Math.abs(totals.reduce((sum, c) => sum + c.share, 0) - 1) < 1e-9);
    assert.equal(categoryTotals([], DEFAULT_CATEGORIES).length, 0);
  });
});

describe('categories', () => {
  it('falls back to Other for a deleted category', () => {
    assert.equal(getCategory(cats, 'c_pets').label, 'Pets');
    assert.equal(getCategory(cats, 'deleted_one').id, 'other');
    const totals = categoryTotals([mk(1, 100, 1, 'deleted_one'), mk(2, 50, 1, 'other')], cats);
    assert.equal(totals.length, 1);
    assert.equal(totals[0].totalCents, 150);
  });
});

describe('searchExpenses', () => {
  const list = [
    mk(1, 1250, 1, 'food', 'Jollibee lunch'),
    mk(2, 300, 2, 'transport', 'Jeep'),
    mk(3, 999, 3, 'c_pets', ''),
  ];
  const ids = (query: string) => searchExpenses(list, cats, query).map((e) => e.id);

  it('matches note, category and amount', () => {
    assert.deepEqual(ids('jolli'), [1]);
    assert.deepEqual(ids('TRANSPORT'), [2]);
    assert.deepEqual(ids('pets'), [3]);
    assert.deepEqual(ids('12.50'), [1]);
  });

  it('returns everything for a blank query and nothing for a miss', () => {
    assert.equal(ids('  ').length, 3);
    assert.equal(ids('zzz').length, 0);
  });
});

describe('chart data', () => {
  const oct = [
    mk(1, 100, d(2026, 10, 1)),
    mk(2, 200, d(2026, 10, 1, 18)),
    mk(3, 500, d(2026, 10, 31)),
    mk(4, 700, d(2026, 9, 30)),
    mk(5, 900, d(2026, 7, 4)),
  ];

  it('totals each day of the month', () => {
    const days = dailyTotals(oct, d(2026, 10, 15));
    assert.equal(days.length, 31);
    assert.equal(days[0], 300);
    assert.equal(days[30], 500);
    assert.equal(days.reduce((a, b) => a + b, 0), 800);
    assert.equal(daysInMonth(d(2028, 2, 10)), 29);
  });

  it('totals the last months, oldest first', () => {
    const months = monthlyTotals(oct, d(2026, 10, 15), 6);
    assert.deepEqual(months.map((m) => m.totalCents), [0, 0, 900, 0, 700, 800]); // May..Oct
    assert.equal(new Date(months[0].monthTs).getMonth(), 4);
  });

  it('wraps the year', () => {
    const jan = monthlyTotals([], d(2026, 1, 20), 3);
    assert.deepEqual(jan.map((m) => new Date(m.monthTs).getMonth()), [10, 11, 0]);
  });
});

describe('toCsv', () => {
  const row = (title: string, category = 'food') => toCsv([mk(9, 1250, now, category, title)], cats).split('\n')[1];

  it('has a header and uses the category label', () => {
    assert.ok(toCsv([], cats).startsWith('date,time,category,note,amount'));
    assert.ok(toCsv([mk(1, 100, d(2026, 1, 1), 'c_pets', 'Kibble')], cats).includes(',Pets,Kibble,1.00'));
  });

  it('quotes commas, quotes and line breaks', () => {
    assert.ok(row('Lunch, "big"').includes('"Lunch, ""big"""'));
    assert.ok(toCsv([mk(9, 1, now, 'food', 'a\r\nb')], cats).includes('"a\r\nb"'));
    assert.ok(toCsv([mk(9, 1, now, 'food', 'a\rb')], cats).includes('"a\rb"'));
  });

  it('keeps note text from running as a spreadsheet formula', () => {
    for (const title of ['=1+1', '+SUM(A1)', '-2+3', '@SUM(A1)', '\t=1', '\r=1']) {
      const cell = row(title).split(',').slice(3, -1).join(',');
      assert.ok(/^"?'/.test(cell), `${JSON.stringify(title)} became ${cell}`);
    }
    assert.ok(row('=HYPERLINK("http://x.test","hi")').includes(`"'=HYPERLINK(""http://x.test"",""hi"")"`));
  });

  it('also covers the category label and leaves ordinary text alone', () => {
    const evil: Category[] = [{ id: 'evil', label: '=cmd', emoji: 'x' }];
    assert.ok(toCsv([mk(1, 100, now, 'evil', 'ok')], evil).includes(",'=cmd,ok,1.00"));
    assert.ok(row('Coffee - oat milk').endsWith(',Coffee - oat milk,12.50'));
  });
});

describe('toCsvFile', () => {
  const rows = [mk(1, 1250, d(2026, 10, 1), 'food', 'Café ₱ lunch'), mk(2, 300, d(2026, 10, 2), 'transport', 'Jeep')];

  it('starts with a byte order mark so Excel reads UTF-8', () => {
    assert.equal(toCsvFile(rows, cats).charCodeAt(0), 0xfeff);
  });

  it('uses Windows line endings and ends with one', () => {
    const text = toCsvFile(rows, cats);
    assert.ok(text.endsWith('\r\n'));
    assert.equal(text.split('\r\n').length, 4); // header, 2 rows, empty after the last
    assert.ok(!text.replace(/\r\n/g, '').includes('\n'));
  });

  it('has the same content as the plain-text CSV', () => {
    assert.equal(toCsvFile(rows, cats).slice(1).trimEnd().replace(/\r\n/g, '\n'), toCsv(rows, cats));
  });

  it('is just a header for no expenses', () => {
    assert.equal(toCsvFile([], cats), '\uFEFFdate,time,category,note,amount\r\n');
  });
});
