import type { SheetNotice } from '@/components/action-sheet';
import { openNotificationSettings, permissionDetail, remindersAvailable } from '@/lib/reminders';

/** Built when needed, so it can include what the phone just reported (useful if turning it on does not help). */
export const notificationsOff = (): SheetNotice =>
  remindersAvailable() ? permissionOff() : unavailable();

/** The phone's notifications code could not load (some Expo Go versions); settings would not help. */
const unavailable = (): SheetNotice => ({
  title: 'Reminders unavailable',
  message:
    "Reminders can't run in this version of the app. They work in the installed Gastos app from Google Play.",
  cancelLabel: 'OK',
});

const permissionOff = (): SheetNotice => ({
  title: 'Notifications are off',
  message:
    "Allow notifications for Gastos in your phone's settings to get reminders. Tap Open Settings, then Notifications." +
    (permissionDetail() ? `\n\nPhone says: ${permissionDetail()}` : ''),
  actions: [{ label: 'Open Settings', onPress: openNotificationSettings }],
  cancelLabel: 'Not now',
});

export const TEST_SENT: SheetNotice = {
  title: 'Test sent',
  message:
    'A notification will appear in a few seconds. Leave the app or pull down your notification shade to see it.',
  cancelLabel: 'OK',
};

export const somethingWentWrong = (title: string): SheetNotice => ({
  title,
  message: 'Something went wrong. Please try again.',
  cancelLabel: 'OK',
});

/** The "are you sure" shown before a recurring item is deleted. */
export const confirmStop = (label: string, onConfirm: () => void): SheetNotice => ({
  title: `Stop “${label}”?`,
  message: 'Expenses already logged stay in your history.',
  actions: [{ label: 'Stop repeating', destructive: true, onPress: onConfirm }],
  cancelLabel: 'Keep it',
});

/** Shown after adding an item whose first due day is today, which logs an expense straight away. */
export const addedToday = (label: string): SheetNotice => ({
  title: 'Added',
  message: `${label} is due today, so it was added to today's expenses.`,
  cancelLabel: 'OK',
});
