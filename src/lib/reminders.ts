import { Linking } from 'react-native';

import { getCategory, type Category } from './expenses';
import { formatMoney } from './money';
import { reminderTimes, type Recurring } from './recurring';

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'reminders';
/** Reminders scheduled ahead per item, and overall; phones cap how many can be pending. */
const PER_ITEM = 12;
const MAX_TOTAL = 60;

let cached: NotificationsModule | null | undefined;

/** The notifications module, or null if it cannot load here; reminders then quietly do nothing. */
function load(): NotificationsModule | null {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('expo-notifications') as NotificationsModule;
    } catch (error) {
      console.warn('Notifications are not available', error);
      cached = null;
    }
  }
  return cached;
}

/** Android only (ignored elsewhere). A failure here must never be mistaken for "notifications off". */
async function ensureChannel(notifications: NotificationsModule) {
  try {
    await notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recurring expense reminders',
      importance: notifications.AndroidImportance.DEFAULT,
    });
  } catch (error) {
    console.warn('Could not create the reminders channel', error);
  }
}

type Permission = Awaited<ReturnType<NotificationsModule['getPermissionsAsync']>>;

/**
 * Whether the phone lets this app show notifications. Android 13+ reports `granted` from the
 * runtime permission alone, which can stay "denied" even after the person switched notifications
 * on in the phone's settings (Xiaomi's settings page does this). Its importance reading follows
 * that switch: 0 means blocked, anything else means allowed.
 */
function isAllowed(permission: Permission): boolean {
  if (permission.granted) return true;
  const importance = permission.android?.importance;
  return typeof importance === 'number' && importance !== 0;
}

/** What the phone last said about permission; shown in the "off" message so a failure can be traced. */
let lastPermissionDetail = '';

export function permissionDetail(): string {
  return lastPermissionDetail;
}

/** Call once at startup so reminders also show while the app is open. */
export async function configureReminders() {
  const notifications = load();
  if (!notifications) return;
  try {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    await ensureChannel(notifications);
  } catch (error) {
    console.warn('Could not set up reminders', error);
  }
}

/** Ask for notification permission if needed. Returns whether reminders can be shown. */
export async function ensureReminderPermission(): Promise<boolean> {
  const notifications = load();
  if (!notifications) {
    lastPermissionDetail = 'the notifications module could not be loaded';
    return false;
  }
  try {
    await ensureChannel(notifications);
    let current = await notifications.getPermissionsAsync();
    if (!isAllowed(current) && current.canAskAgain) {
      current = await notifications.requestPermissionsAsync();
    }
    lastPermissionDetail = `granted=${current.granted}, status=${current.status}, canAskAgain=${current.canAskAgain}, importance=${current.android?.importance ?? 'n/a'}`;
    return isAllowed(current);
  } catch (error) {
    console.warn('Could not ask for notification permission', error);
    lastPermissionDetail = `error: ${error instanceof Error ? error.message : String(error)}`;
    return false;
  }
}

/** Open the phone's settings page for this app, where notifications can be turned on. */
export function openNotificationSettings() {
  Linking.openSettings().catch((error) => console.warn('Could not open Settings', error));
}

function whenText(days: number): string {
  if (days === 0) return 'is due today';
  if (days === 1) return 'is due tomorrow';
  return `is due in ${days} days`;
}

async function schedule(
  items: Recurring[],
  categories: Category[],
  currency: string
): Promise<void> {
  const notifications = load();
  if (!notifications) return;

  // Everything pending belongs to this app's reminders, so start clean and schedule it all again.
  await notifications.cancelAllScheduledNotificationsAsync();
  if (!items.some((item) => !item.paused && item.remindDays !== null)) return;
  if (!isAllowed(await notifications.getPermissionsAsync())) return;

  const now = Date.now();
  // Soonest first, so if the cap bites it drops the furthest-away ones.
  const upcoming = items
    .flatMap((item) => reminderTimes(item, now, PER_ITEM).map((at) => ({ item, at })))
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_TOTAL);

  for (const { item, at } of upcoming) {
    const label = item.title || getCategory(categories, item.category).label;
    await notifications.scheduleNotificationAsync({
      content: {
        title: `${label} ${whenText(item.remindDays ?? 0)}`,
        body: `${formatMoney(item.amountCents, currency)} · Gastos logs it for you when you open the app.`,
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(at),
        channelId: CHANNEL_ID,
      },
    });
  }
}

// Syncs queue up so two quick changes can never interleave their cancel and schedule steps.
let queue: Promise<void> = Promise.resolve();

/** Make the phone's pending reminders match the recurring items. Safe to call as often as needed. */
export function syncReminders(
  items: Recurring[],
  categories: Category[],
  currency: string
): Promise<void> {
  queue = queue
    .then(() => schedule(items, categories, currency))
    .catch((error) => console.warn('Could not schedule reminders', error));
  return queue;
}

/** Show a notification in a few seconds so the person can see reminders work. */
export async function sendTestReminder(): Promise<boolean> {
  const notifications = load();
  if (!notifications) return false;
  if (!(await ensureReminderPermission())) return false;
  try {
    await notifications.scheduleNotificationAsync({
      content: { title: 'Gastos reminders are on 🎉', body: 'This is how a recurring reminder will look.' },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: CHANNEL_ID,
      },
    });
    return true;
  } catch (error) {
    console.warn('Could not send the test reminder', error);
    return false;
  }
}
