import { OTHER_CATEGORY_ID, type Category } from './expenses';
import { MAX_CENTS, parseAmountToCents } from './money';

/** What the voice and receipt flows hand to the add form, for the user to confirm. */
export type Draft = {
  amountCents: number | null;
  title: string;
  category: string;
};

/** Words that hint at a category. Matched against the default category ids; custom ones match by label. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['lunch', 'dinner', 'breakfast', 'snack', 'coffee', 'meal', 'restaurant', 'jollibee', 'mcdo', 'pizza', 'burger', 'milk tea', 'food', 'merienda', 'cafe'],
  groceries: ['grocery', 'groceries', 'supermarket', 'market', 'palengke', 'sm supermarket', 'puregold', 'mart'],
  transport: ['grab', 'taxi', 'jeep', 'jeepney', 'bus', 'fare', 'gas', 'gasoline', 'fuel', 'toll', 'parking', 'angkas', 'mrt', 'lrt', 'train', 'commute', 'load'],
  bills: ['bill', 'bills', 'electric', 'electricity', 'water', 'internet', 'wifi', 'rent', 'meralco', 'subscription', 'insurance', 'tuition'],
  shopping: ['shopping', 'clothes', 'shirt', 'shoes', 'mall', 'lazada', 'shopee', 'gift', 'bag'],
  health: ['medicine', 'pharmacy', 'doctor', 'clinic', 'hospital', 'vitamins', 'dentist', 'mercury', 'checkup'],
  fun: ['movie', 'cinema', 'netflix', 'game', 'games', 'concert', 'party', 'bar', 'drinks', 'beer', 'spotify'],
};

const CURRENCY_WORDS = /\b(pesos?|php|piso|dollars?|bucks?|usd|euros?|eur)\b|[₱$€£]/gi;
const FILLER_WORDS = /\b(i|we)?\s*(spent|paid|bought|buy|add|expense|for|on|at|of|worth|was|cost|costs|costing|a|an|the|my|to|about|around|just)\b/gi;

/** Pick the category whose label or keywords appear in the text, or "Other". */
export function guessCategory(text: string, categories: Category[]): string {
  const lower = ` ${text.toLowerCase()} `;
  const has = (word: string) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`).test(lower);

  for (const category of categories) {
    if (category.id !== OTHER_CATEGORY_ID && has(category.label.toLowerCase())) return category.id;
  }
  for (const category of categories) {
    if ((CATEGORY_KEYWORDS[category.id] ?? []).some(has)) return category.id;
  }
  return OTHER_CATEGORY_ID;
}

/** Number words people say out loud, in English and the Taglish/Tagalog they mix in. */
const SMALL_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
  isa: 1, isang: 1, uno: 1, dalawa: 2, dalawang: 2, dos: 2, tatlo: 3, tatlong: 3, tres: 3,
  apat: 4, kwatro: 4, lima: 5, limang: 5, singko: 5, anim: 6, sais: 6, pito: 7, pitong: 7,
  siyete: 7, walo: 8, walong: 8, otso: 8, siyam: 9, nuebe: 9, sampu: 10, sampung: 10, diyes: 10,
  sandaan: 100, sanlibo: 1000,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80,
  ninety: 90,
  bente: 20, trenta: 30, kwarenta: 40, singkwenta: 50, sisenta: 60, setenta: 70, otsenta: 80,
  nobenta: 90, dalawampu: 20, tatlumpu: 30, apatnapu: 40, limampu: 50, animnapu: 60,
  pitumpu: 70, walumpu: 80, siyamnapu: 90,
};
const HUNDRED = new Set(['hundred', 'daan', 'daang']);
const BIG_SCALES: Record<string, number> = {
  thousand: 1000, libo: 1000, libong: 1000, million: 1_000_000, milyon: 1_000_000,
};
const LINKERS = new Set(['and', 'at', 'na', 'ng', 'nang']);

function isNumberWord(word: string): boolean {
  return word in SMALL_NUMBERS || word in TENS || HUNDRED.has(word) || word in BIG_SCALES;
}

/** Value of a run of number words, e.g. ["two","hundred","fifty"] -> 250, ["one","fifty"] -> 150. */
function wordsValue(words: string[]): number {
  let total = 0;
  let current = 0;
  let lastWasDigitWord = false;
  for (const word of words) {
    if (LINKERS.has(word)) continue;
    if (word in SMALL_NUMBERS || word in TENS) {
      const value = word in SMALL_NUMBERS ? SMALL_NUMBERS[word] : TENS[word];
      // "one fifty" is how people say 150.
      if (lastWasDigitWord && word in TENS && current >= 1 && current <= 9) {
        current = current * 100 + value;
      } else {
        current += value;
      }
      lastWasDigitWord = word in SMALL_NUMBERS && value >= 1 && value <= 9;
    } else if (HUNDRED.has(word)) {
      current = (current || 1) * 100;
      lastWasDigitWord = false;
    } else {
      total += (current || 1) * BIG_SCALES[word];
      current = 0;
      lastWasDigitWord = false;
    }
  }
  return total + current;
}

/** Replace spoken numbers with digits: "two hundred fifty for dinner" -> "250 for dinner". */
export function numberWordsToDigits(text: string): string {
  const tokens = text.split(' ');
  const lookup = (t: string | undefined) => (t ?? '').toLowerCase().replace(/[.,!?;:]+$/, '');
  const out: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    if (!isNumberWord(lookup(tokens[i]))) {
      out.push(tokens[i]);
      i++;
      continue;
    }
    const run: string[] = [];
    let j = i;
    while (j < tokens.length) {
      const word = lookup(tokens[j]);
      const isLinkerBetween =
        LINKERS.has(word) && run.length > 0 && isNumberWord(lookup(tokens[j + 1]));
      if (!isNumberWord(word) && !isLinkerBetween) break;
      run.push(word);
      j++;
    }
    const trailing = (tokens[j - 1].match(/[.,!?;:]+$/) ?? [''])[0];
    out.push(`${wordsValue(run)}${trailing}`);
    i = j;
  }
  return out.join(' ');
}

/**
 * Turn a sentence like "lunch 150 pesos", "spent 1,250.50 on groceries", "two hundred fifty
 * for dinner" or "5k rent" into an amount, a note and a category. With several numbers
 * ("2 coffees 150") the biggest one is the price and the rest stay in the note.
 */
export function parseSpoken(text: string, categories: Category[]): Draft {
  const cleaned = numberWordsToDigits(text.replace(/\s+/g, ' ').trim());

  let best: { raw: string; cents: number } | null = null;
  for (const m of cleaned.matchAll(/(\d[\d,]*(?:\.\d+)?|\.\d+)(\s?k\b)?/gi)) {
    const digits = m[1].replace(/,(?=\d{3}\b)/g, '');
    const cents = parseAmountToCents(m[2] ? String(Number(digits) * 1000) : digits);
    if (cents !== null && (best === null || cents > best.cents)) best = { raw: m[0], cents };
  }

  const amountCents = best?.cents ?? null;
  const rest = best ? cleaned.replace(best.raw, ' ') : cleaned;

  const title = rest
    .replace(CURRENCY_WORDS, ' ')
    .replace(FILLER_WORDS, ' ')
    .replace(/[^\p{L}\p{N}\s'&-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    amountCents,
    title: title ? title[0].toUpperCase() + title.slice(1) : '',
    category: guessCategory(cleaned, categories),
  };
}

const TOTAL_LINE = /\b(grand\s*total|total\s*due|amount\s*due|total\s*amount|net\s*total|balance\s*due|total)\b/i;
const NOT_TOTAL = /\b(sub\s*-?\s*total|total\s*(?:items?|qty|quantity|savings|discount)|vat|tax)\b/i;
const AMOUNT = /(?:[₱$€£]|php|usd)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2}|\d+)/gi;

function amountsIn(line: string): number[] {
  const found: number[] = [];
  for (const m of line.matchAll(AMOUNT)) {
    const cents = parseAmountToCents(m[1]);
    // A bare integer with no decimals is usually a quantity, date or id, so only trust it on a total line.
    if (cents !== null && cents <= MAX_CENTS) found.push(cents);
  }
  return found;
}

/**
 * Find the total on a receipt from its OCR lines. Prefers an amount on a "TOTAL" line (or the
 * line after it, since receipts often print the label and the number apart), skipping subtotal,
 * tax and item-count lines. Falls back to the largest decimal amount on the receipt.
 */
export function parseReceipt(lines: string[], categories: Category[]): Draft {
  const clean = lines.map((l) => l.trim()).filter(Boolean);

  let totalCents: number | null = null;
  for (let i = clean.length - 1; i >= 0; i--) {
    const line = clean[i];
    if (!TOTAL_LINE.test(line) || NOT_TOTAL.test(line)) continue;
    const here = amountsIn(line.replace(TOTAL_LINE, ' '));
    const next = amountsIn(clean[i + 1] ?? '');
    const candidates = here.length > 0 ? here : next;
    if (candidates.length > 0) {
      totalCents = Math.max(...candidates);
      break;
    }
  }

  if (totalCents === null) {
    const decimals = clean
      .filter((l) => !NOT_TOTAL.test(l))
      .flatMap((l) => [...l.matchAll(/\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g)].map((m) => parseAmountToCents(m[0])))
      .filter((c): c is number => c !== null);
    totalCents = decimals.length > 0 ? Math.max(...decimals) : null;
  }

  // The store name is normally the first line that is mostly letters.
  const merchant =
    clean.find((l) => {
      const letters = (l.match(/\p{L}/gu) ?? []).length;
      return l.length >= 3 && letters / l.length > 0.6 && !TOTAL_LINE.test(l);
    }) ?? '';
  const title = merchant
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    .slice(0, 60);

  return {
    amountCents: totalCents,
    title,
    category: guessCategory(clean.join(' '), categories),
  };
}
