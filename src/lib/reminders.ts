import { Linking } from 'react-native';

import { getCategory, type Category } from './expenses';
import { formatMoney } from './money';
import { balanceCents, loanReminderTime, type Loan } from './loans';
import { reminderTimes, type Recurring } from './recurring';

type Full = typeof import('expo-notifications');
type NotificationsModule = Pick<
  Full,
  | 'setNotificationHandler'
  | 'setNotificationChannelAsync'
  | 'AndroidImportance'
  | 'getPermissionsAsync'
  | 'requestPermissionsAsync'
  | 'cancelAllScheduledNotificationsAsync'
  | 'scheduleNotificationAsync'
  | 'SchedulableTriggerInputTypes'
>;

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
    } catch {
      cached = loadParts();
    }
  }
  return cached;
}

/**
 * The package entry also loads push-topic code that Expo Go lacks, so it throws there. The local
 * reminders only need these files, which load fine. Null if even they cannot (logged quietly,
 * since a yellow warning box would only scare people).
 */
function loadParts(): NotificationsModule | null {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const permissions = require('expo-notifications/build/NotificationPermissions');
    const handler = require('expo-notifications/build/NotificationsHandler');
    const channel = require('expo-notifications/build/setNotificationChannelAsync');
    const cancelAll = require('expo-notifications/build/cancelAllScheduledNotificationsAsync');
    const scheduler = require('expo-notifications/build/scheduleNotificationAsync');
    const channelTypes = require('expo-notifications/build/NotificationChannelManager.types');
    const types = require('expo-notifications/build/Notifications.types');
    /* eslint-enable @typescript-eslint/no-require-imports */
    return {
      setNotificationHandler: handler.setNotificationHandler,
      setNotificationChannelAsync: channel.setNotificationChannelAsync,
      AndroidImportance: channelTypes.AndroidImportance,
      getPermissionsAsync: permissions.getPermissionsAsync,
      requestPermissionsAsync: permissions.requestPermissionsAsync,
      cancelAllScheduledNotificationsAsync: cancelAll.cancelAllScheduledNotificationsAsync,
      scheduleNotificationAsync: scheduler.scheduleNotificationAsync,
      SchedulableTriggerInputTypes: types.SchedulableTriggerInputTypes,
    };
  } catch (error) {
    console.log('Notifications are not available here', error);
    return null;
  }
}

/** False when the notifications code cannot load at all (some Expo Go versions), as opposed to permission being off. */
export function remindersAvailable(): boolean {
  return load() !== null;
}

let channelReady = false;

/** Android only (ignored elsewhere). A failure here must never be mistaken for "notifications off". */
async function ensureChannel(notifications: NotificationsModule) {
  try {
    channelReady = false;
    await notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recurring expense reminders',
      importance: notifications.AndroidImportance.DEFAULT,
    });
    channelReady = true;
  } catch (error) {
    // Expo Go can fail here; reminders then use the phone's default channel instead.
    console.log('Could not create the reminders channel', error);
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

function reminderContent(item: Recurring, categories: Category[], currency: string) {
  const label = item.title || getCategory(categories, item.category).label;
  return {
    title: `${label} ${whenText(item.remindDays ?? 0)}`,
    body: `${formatMoney(item.amountCents, currency)} · Gastos logs it for you when you open the app.`,
  };
}

/** The notification for a loan that falls due: who, how much, and which way the money goes. */
function loanContent(loan: Loan, currency: string) {
  const left = formatMoney(balanceCents(loan), currency);
  return loan.direction === 'lent'
    ? {
        title: `${loan.person} was due to pay you back today`,
        body: `${left} is still open. Open Gastos to record a payment or send a reminder.`,
      }
    : {
        title: `Time to pay ${loan.person} back`,
        body: `You owe ${left}, due today. Open Gastos to record the payment.`,
      };
}

async function schedule(
  items: Recurring[],
  loans: Loan[],
  categories: Category[],
  currency: string
): Promise<void> {
  const notifications = load();
  if (!notifications) return;

  // Everything pending belongs to this app's reminders, so start clean and schedule it all again.
  await notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  const dueLoans = loans.filter((loan) => loanReminderTime(loan, now) !== null);
  const hasRecurring = items.some((item) => !item.paused && item.remindDays !== null);
  if (!hasRecurring && dueLoans.length === 0) return;
  if (!isAllowed(await notifications.getPermissionsAsync())) return;

  // Soonest first, so if the cap bites it drops the furthest-away ones.
  const upcoming = [
    ...items.flatMap((item) =>
      reminderTimes(item, now, PER_ITEM).map((at) => ({ at, content: reminderContent(item, categories, currency) }))
    ),
    ...dueLoans.map((loan) => ({
      at: loanReminderTime(loan, now) as number,
      content: loanContent(loan, currency),
    })),
  ]
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_TOTAL);

  for (const { content, at } of upcoming) {
    await notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(at),
        ...(channelReady ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }
}

// Syncs queue up so two quick changes can never interleave their cancel and schedule steps.
let queue: Promise<void> = Promise.resolve();

/** Make the phone's pending reminders match the recurring items and loan due dates. Safe to call as often as needed. */
export function syncReminders(
  items: Recurring[],
  loans: Loan[],
  categories: Category[],
  currency: string
): Promise<void> {
  queue = queue
    .then(() => schedule(items, loans, categories, currency))
    .catch((error) => console.warn('Could not schedule reminders', error));
  return queue;
}

/** Show a notification in a few seconds so the person can see reminders work. */
export async function sendTestReminder(
  item: Recurring | undefined,
  categories: Category[],
  currency: string
): Promise<boolean> {
  const notifications = load();
  if (!notifications) return false;
  if (!(await ensureReminderPermission())) return false;
  try {
    await notifications.scheduleNotificationAsync({
      content: item
        ? reminderContent(item, categories, currency)
        : { title: 'Gastos reminders are on 🎉', body: 'This is how a recurring reminder will look.' },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        ...(channelReady ? { channelId: CHANNEL_ID } : {}),
      },
    });
    return true;
  } catch (error) {
    console.warn('Could not send the test reminder', error);
    return false;
  }
}
