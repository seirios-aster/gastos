import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useExpenses } from '@/context/expenses-context';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { dueSoonCount } from '@/lib/recurring';

// Alpha-only PNGs (24dp, with @2x and @3x): the bar tints them with iconColor, so one file serves
// both themes. Outline = idle, filled and heavier = selected, so the selected tab is not shown by
// color alone. Made from Material Symbols (Apache-2.0): home, history, event_repeat.
const ICONS = {
  today: {
    default: require('@/assets/images/tabIcons/tab-today.png'),
    selected: require('@/assets/images/tabIcons/tab-today-active.png'),
  },
  history: {
    default: require('@/assets/images/tabIcons/tab-history.png'),
    selected: require('@/assets/images/tabIcons/tab-history-active.png'),
  },
  recurring: {
    default: require('@/assets/images/tabIcons/tab-recurring.png'),
    selected: require('@/assets/images/tabIcons/tab-recurring-active.png'),
  },
};

/** The Recurring tab shows a badge when something is due within this many days. */
const SOON_DAYS = 3;

export default function AppTabs() {
  const theme = useTheme();
  const now = useNow();
  const { recurring } = useExpenses();
  // Items due today are logged the moment the app opens, so this is really tomorrow through day 3.
  const soon = dueSoonCount(recurring, now, SOON_DAYS);

  return (
    <NativeTabs
      backgroundColor={theme.background}
      iconColor={{ default: theme.textSecondary, selected: theme.accent }}
      // Android lets the selected label differ from the others only in color and size.
      labelStyle={{
        default: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
        selected: { color: theme.text, fontSize: 12 },
      }}
      indicatorColor={theme.accentSoft}
      rippleColor={theme.ripple}
      badgeBackgroundColor={theme.accent}
      badgeTextColor={theme.onAccent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={ICONS.today} renderingMode="template" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={ICONS.history} renderingMode="template" />
      </NativeTabs.Trigger>

      {/* The label replaces the visible text for a screen reader, so it must still say "Recurring". */}
      <NativeTabs.Trigger
        name="recurring"
        accessibilityLabel={soon > 0 ? `Recurring, ${soon} coming up` : 'Recurring'}>
        <NativeTabs.Trigger.Label>Recurring</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={ICONS.recurring} renderingMode="template" />
        {/* `hidden` is ignored when there are children, so pass none at all when nothing is coming. */}
        <NativeTabs.Trigger.Badge hidden={soon === 0}>
          {soon > 0 ? String(soon) : undefined}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
