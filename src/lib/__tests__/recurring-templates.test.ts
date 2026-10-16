import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_CATEGORIES } from '../expenses';
import { draftFromTemplate, RECURRING_TEMPLATES } from '../recurring-templates';

const wed = new Date(2026, 9, 14, 15).getTime(); // Wed Oct 14 2026

describe('RECURRING_TEMPLATES', () => {
  it('are well formed', () => {
    const ids = RECURRING_TEMPLATES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
    const categories = DEFAULT_CATEGORIES.map((c) => c.id);
    for (const t of RECURRING_TEMPLATES) {
      assert.ok(t.title.trim().length > 0 && t.title.length <= 30, `${t.id} title`);
      assert.ok(categories.includes(t.category), `${t.id} uses a built-in category`);
      if (t.day !== undefined) {
        const max = t.frequency === 'weekly' ? 6 : 31;
        const min = t.frequency === 'weekly' ? 0 : 1;
        assert.ok(t.day >= min && t.day <= max, `${t.id} day`);
      }
    }
  });
});

describe('draftFromTemplate', () => {
  const ids = DEFAULT_CATEGORIES.map((c) => c.id);
  const find = (id: string) => RECURRING_TEMPLATES.find((t) => t.id === id)!;

  it('uses the template values and its own day when it has one', () => {
    assert.deepEqual(draftFromTemplate(find('rent'), ids, wed), {
      title: 'Rent', category: 'bills', frequency: 'monthly', day: 1,
    });
    assert.equal(draftFromTemplate(find('allowance'), ids, wed).day, 1); // Monday
  });

  it("starts from today's weekday or date otherwise", () => {
    assert.equal(draftFromTemplate(find('load'), ids, wed).day, 3); // Wednesday
    assert.equal(draftFromTemplate(find('netflix'), ids, wed).day, 14);
  });

  it('falls back to Other when the category was deleted', () => {
    assert.equal(draftFromTemplate(find('netflix'), ['bills', 'other'], wed).category, 'other');
  });
});
