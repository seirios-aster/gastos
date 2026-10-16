import type { Frequency } from './recurring';

export type RecurringTemplate = {
  id: string;
  emoji: string;
  /** Becomes the note, e.g. "Rent". */
  title: string;
  /** A default category id; the form falls back to "other" if the person deleted it. */
  category: string;
  frequency: Frequency;
  /** Weekday (0 = Sunday) or day of the month; leave out to start from today's. */
  day?: number;
};

/** One-tap starting points for the empty Recurring screen and the add form. Amounts are left for the person. */
export const RECURRING_TEMPLATES: readonly RecurringTemplate[] = [
  { id: 'rent', emoji: '🏠', title: 'Rent', category: 'bills', frequency: 'monthly', day: 1 },
  { id: 'electricity', emoji: '💡', title: 'Electricity', category: 'bills', frequency: 'monthly' },
  { id: 'water', emoji: '💧', title: 'Water', category: 'bills', frequency: 'monthly' },
  { id: 'internet', emoji: '📶', title: 'Internet', category: 'bills', frequency: 'monthly' },
  { id: 'load', emoji: '📱', title: 'Mobile load', category: 'bills', frequency: 'weekly' },
  { id: 'netflix', emoji: '📺', title: 'Netflix', category: 'fun', frequency: 'monthly' },
  { id: 'spotify', emoji: '🎵', title: 'Spotify', category: 'fun', frequency: 'monthly' },
  { id: 'allowance', emoji: '💵', title: 'Allowance', category: 'other', frequency: 'weekly', day: 1 },
  { id: 'insurance', emoji: '🛡️', title: 'Insurance', category: 'health', frequency: 'monthly' },
];

export type RecurringDraft = {
  title: string;
  category: string;
  frequency: Frequency;
  /** Weekday (weekly) or day of the month (monthly). */
  day: number;
};

/** The add form's starting values for a template; `categoryIds` are the person's current categories. */
export function draftFromTemplate(
  template: RecurringTemplate,
  categoryIds: readonly string[],
  now: number
): RecurringDraft {
  const today = new Date(now);
  return {
    title: template.title,
    category: categoryIds.includes(template.category) ? template.category : 'other',
    frequency: template.frequency,
    day: template.day ?? (template.frequency === 'weekly' ? today.getDay() : today.getDate()),
  };
}
