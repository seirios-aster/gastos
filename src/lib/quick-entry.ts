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

/**
 * Turn a sentence like "lunch 150 pesos", "spent 1,250.50 on groceries" or "150 for grab"
 * into an amount, a note and a category. The amount is the first number in the sentence.
 */
export function parseSpoken(text: string, categories: Category[]): Draft {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/\d[\d,]*(?:\.\d+)?|\.\d+/);

  let amountCents: number | null = null;
  let rest = cleaned;
  if (match) {
    amountCents = parseAmountToCents(match[0].replace(/,(?=\d{3}\b)/g, ''));
    rest = cleaned.replace(match[0], ' ');
  }

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
