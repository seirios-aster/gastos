/** About 999 million in major units, far below 2^53 so sums over many rows stay exact. */
export const MAX_CENTS = 99_999_999_999;

/** Parse what the user typed ("12", "12.5", "12,50", "1,234.50") into integer cents. */
export function parseAmountToCents(input: string): number | null {
  let text = input.trim().replace(/\s/g, '');
  if (text.includes('.') && text.includes(',')) {
    text = text.replace(/,/g, '');
  } else {
    text = text.replace(',', '.');
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return null;

  const cents = Math.round(parseFloat(text) * 100);
  return cents > 0 && cents <= MAX_CENTS ? cents : null;
}

/** Format cents with an optional currency symbol, e.g. (1250, "$") -> "$12.50". */
export function formatMoney(cents: number, symbol: string): string {
  const number = (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${symbol}${number}` : number;
}

/** Cents as a plain editable string, e.g. 1250 -> "12.50". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
