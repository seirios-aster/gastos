import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_CATEGORIES } from '../expenses';
import { guessCategory, numberWordsToDigits, parseReceipt, parseSpoken } from '../quick-entry';

const cats = DEFAULT_CATEGORIES;

describe('parseSpoken', () => {
  it('reads note first, amount second', () => {
    assert.deepEqual(parseSpoken('lunch 150 pesos', cats), {
      amountCents: 15000,
      title: 'Lunch',
      category: 'food',
    });
  });

  it('reads amount first and strips filler words', () => {
    const d = parseSpoken('I spent 1,250.50 on groceries', cats);
    assert.equal(d.amountCents, 125050);
    assert.equal(d.title, 'Groceries');
    assert.equal(d.category, 'groceries');
  });

  it('handles currency symbols and keywords', () => {
    const d = parseSpoken('₱85 for grab to work', cats);
    assert.equal(d.amountCents, 8500);
    assert.equal(d.category, 'transport');
    assert.equal(d.title, 'Grab work');
  });

  it('keeps decimals', () => {
    assert.equal(parseSpoken('coffee 4.75', cats).amountCents, 475);
  });

  it('returns no amount when none was said', () => {
    const d = parseSpoken('bought some coffee', cats);
    assert.equal(d.amountCents, null);
    assert.equal(d.category, 'food');
  });

  it('falls back to Other and an empty note', () => {
    assert.deepEqual(parseSpoken('200', cats), { amountCents: 20000, title: '', category: 'other' });
  });

  it('matches custom categories by label', () => {
    const custom = [...cats, { id: 'pets', label: 'Pets', emoji: '🐶' }];
    assert.equal(parseSpoken('pets 300', custom).category, 'pets');
  });
});

describe('spoken numbers', () => {
  const cents = (text: string) => parseSpoken(text, cats).amountCents;

  it('reads English number words', () => {
    assert.equal(cents('two hundred fifty for dinner'), 25000);
    assert.equal(cents('lunch one hundred and twenty'), 12000);
    assert.equal(cents('rent one thousand five hundred'), 150000);
    assert.equal(cents('two hundred fifty thousand house'), 25000000);
    assert.equal(cents('twelve hundred for shoes'), 120000);
    assert.equal(cents('a hundred pesos grab'), 10000);
    assert.equal(cents('ninety nine pesos coffee'), 9900);
  });

  it('reads the colloquial "one fifty"', () => {
    assert.equal(cents('lunch one fifty'), 15000);
    assert.equal(cents('grab two fifty'), 25000);
  });

  it('reads Taglish number words', () => {
    assert.equal(cents('dalawang daan pamasahe'), 20000);
    assert.equal(cents('singkwenta pesos kape'), 5000);
    assert.equal(cents('isang libo bills'), 100000);
    assert.equal(cents('tatlong daan at limampu'), 35000);
  });

  it('reads 5k style amounts', () => {
    assert.equal(cents('rent 5k'), 500000);
    assert.equal(cents('1.5k shopping'), 150000);
  });

  it('keeps the note and category', () => {
    const d = parseSpoken('two hundred fifty for dinner', cats);
    assert.equal(d.title, 'Dinner');
    assert.equal(d.category, 'food');
  });

  it('picks the biggest number as the price', () => {
    const d = parseSpoken('one coffee 150', cats);
    assert.equal(d.amountCents, 15000);
    assert.equal(d.title, '1 coffee');
    assert.equal(parseSpoken('2 coffees 150', cats).amountCents, 15000);
  });

  it('leaves ordinary words alone', () => {
    assert.equal(numberWordsToDigits('lunch at jollibee'), 'lunch at jollibee');
    assert.equal(numberWordsToDigits('someone paid at ten'), 'someone paid at 10');
  });
});

describe('guessCategory', () => {
  it('does not match inside other words', () => {
    assert.equal(guessCategory('barbecue 100', cats), 'other');
  });
});

describe('parseReceipt', () => {
  it('uses the TOTAL line, not subtotal or tax', () => {
    const d = parseReceipt(
      ['JOLLIBEE', 'Chickenjoy 1pc  99.00', 'Fries  45.00', 'SUBTOTAL 144.00', 'VAT 15.43', 'TOTAL 144.00', 'CASH 200.00'],
      cats
    );
    assert.equal(d.amountCents, 14400);
    assert.equal(d.title, 'Jollibee');
    assert.equal(d.category, 'food');
  });

  it('reads a total printed on the next line', () => {
    const d = parseReceipt(['PUREGOLD', 'Items 12', 'GRAND TOTAL', '₱1,234.50'], cats);
    assert.equal(d.amountCents, 123450);
    assert.equal(d.category, 'groceries');
  });

  it('falls back to the largest decimal amount', () => {
    const d = parseReceipt(['Corner Store', 'Water 20.00', 'Chips 35.50', 'Cash 100.00'], cats);
    assert.equal(d.amountCents, 10000);
  });

  it('gives no amount when nothing looks like money', () => {
    assert.equal(parseReceipt(['Thank you', 'Come again'], cats).amountCents, null);
  });
});
