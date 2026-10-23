import { Tabs, TabList, TabSlot, TabTrigger, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { useRouter } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/backdrop';
import { LiquidSurface } from '@/components/liquid-layer';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useGlass } from '@/hooks/use-glass';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { dueSoonCount } from '@/lib/recurring';
import { markWarm } from '@/lib/app-warm';
import { useIsGlass } from '@/lib/theme-preference';

/**
 * The tab bar, drawn by the app instead of the phone: a straight bar along the bottom edge with a
 * thumb that slides under the chosen tab. In the Glass look the thumb is bent glass (the liquid
 * layer); in Light and Dark it is a plain soft pill. Screens keep BottomTabInset of room at the
 * bottom so their last row can scroll clear of it.
 */

// Alpha-only PNGs (24dp, with @2x and @3x): the bar tints them with iconColor, so one file serves
// both themes. Outline = idle, filled and heavier = selected, so the selected tab is not shown by
// color alone. Made from Material Symbols (Apache-2.0): home, history, event_repeat; the loans icon (two arrows) is drawn to match.
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
  loans: {
    default: require('@/assets/images/tabIcons/tab-loans.png'),
    selected: require('@/assets/images/tabIcons/tab-loans-active.png'),
  },
};

/** The Recurring tab shows a badge when something is due within this many days. */
const SOON_DAYS = 3;

const BAR_HEIGHT = 64;
const PADDING = 6;

type Icons = (typeof ICONS)[keyof typeof ICONS];

/** The slide of the thumb, shared with every tab so the chosen one can move it. */
const BarContext = createContext<SharedValue<number> | null>(null);

type ItemProps = TabTriggerSlotProps & {
  index: number;
  label: string;
  icons: Icons;
  badge?: number;
  a11yLabel?: string;
};

function TabItem({ index, label, icons, badge = 0, a11yLabel, isFocused, children: _children, ...props }: ItemProps) {
  const theme = useTheme();
  const position = useContext(BarContext);
  const selected = !!isFocused;
  // Over glass the idle icons and labels are full white: the dimmer grey got lost against the photo.
  const glass = useIsGlass();

  useEffect(() => {
    if (selected) position?.set(withSpring(index, { damping: 20, stiffness: 260 }));
  }, [selected, index, position]);

  return (
    <Pressable
      {...props}
      role="tab"
      aria-selected={selected}
      accessibilityLabel={a11yLabel ?? label}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <View>
        <Image
          source={selected ? icons.selected : icons.default}
          style={[styles.icon, { tintColor: selected ? theme.accent : glass ? theme.text : theme.textSecondary }]}
        />
        {badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <ThemedText type="caption" themeColor="onAccent" style={styles.badgeText}>
              {badge}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText
        type="caption"
        themeColor={selected || glass ? 'text' : 'textSecondary'}
        style={selected ? styles.labelSelected : styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function GlassBar({ children }: TabListProps) {
  const theme = useTheme();
  const glass = useGlass();
  const isGlass = useIsGlass();
  const insets = useSafeAreaInsets();
  const position = useSharedValue(0);
  const [width, setWidth] = useState(0);

  const count = 4;
  const itemWidth = width > 0 ? (width - PADDING * 2) / count : 0;
  const thumbHeight = BAR_HEIGHT - PADDING * 2;
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * itemWidth }] }));

  return (
    <BarContext.Provider value={position}>
      <View
        accessibilityRole="tablist"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[
          styles.bar,
          // A straight bar across the whole width, down to the phone's bottom edge. The system's
          // bottom area is part of it, so the items sit above that area.
          { height: BAR_HEIGHT + insets.bottom, paddingBottom: PADDING + insets.bottom },
          isGlass
            // See-through glass with an edge only along the top: the sides and bottom run off the screen,
            // so a ring there would just be a line down each side. A dark wash (with the card tint on top, like the
            // number card) keeps the icons and labels readable over whatever scrolls underneath.
            ? [
                { backgroundColor: `${theme.background}A6`, borderTopWidth: 1, borderTopColor: theme.edge },
                { boxShadow: [{ offsetX: 0, offsetY: 10, blurRadius: 20, color: theme.innerGlow, inset: true }] } as ViewStyle,
              ]
            : { backgroundColor: theme.backgroundElement, borderTopWidth: 1, borderTopColor: theme.backgroundSelected },
        ]}>
        {isGlass ? <View pointerEvents="none" style={[styles.tint, { backgroundColor: theme.backgroundElement }]} /> : null}
        {itemWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              { width: itemWidth, height: thumbHeight },
              isGlass ? [{ backgroundColor: theme.backgroundSelected }, glass.selected] : { backgroundColor: theme.accentSoft },
              thumb,
            ]}>
            {/* In Glass the thumb is a lens: the background bends along its edge as it slides. */}
            <LiquidSurface
              active={isGlass}
              radius={thumbHeight / 2}
              band={30}
              strength={30}
              tintFrom={theme.backgroundSelected}
              tintTo={theme.backgroundSelected}
            />
          </Animated.View>
        ) : null}
        {children}
      </View>
    </BarContext.Provider>
  );
}

/** The tabs, in the order they are opened once at startup (Today last, so the app ends where it began). */
const WARM_UP = ['/history', '/recurring', '/loans', '/'] as const;
const WARM_STEP_MS = 110;

export default function AppTabs() {
  const theme = useTheme();
  const isGlass = useIsGlass();
  const router = useRouter();

  // A tab is only built the first time it is opened, which shows as a jump on that first visit. So at
  // startup each tab is opened once, one after the other, while the splash screen is still up (it waits
  // for this to finish, so it works as the loader), and the app ends back on Today.
  useEffect(() => {
    let step = 0;
    let done: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      router.navigate(WARM_UP[step]);
      step += 1;
      if (step === WARM_UP.length) {
        clearInterval(timer);
        done = setTimeout(markWarm, WARM_STEP_MS);
      }
    }, WARM_STEP_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(done);
    };
  }, [router]);
  const now = useNow();
  const { recurring } = useExpenses();
  // Items due today are logged the moment the app opens, so this is really tomorrow through day 3.
  const soon = dueSoonCount(recurring, now, SOON_DAYS);

  return (
    <Tabs>
      {/* One backdrop behind every tab, so switching tabs never redraws it (a photo or the drifting
          shapes redrawn per screen made the page flash). The screens themselves are see-through. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
        {isGlass ? <Backdrop /> : null}
      </View>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <GlassBar>
          <TabTrigger name="index" href="/" asChild>
            <TabItem index={0} label="Today" icons={ICONS.today} />
          </TabTrigger>
          <TabTrigger name="history" href="/history" asChild>
            <TabItem index={1} label="History" icons={ICONS.history} />
          </TabTrigger>
          {/* The label replaces the visible text for a screen reader, so it must still say "Recurring". */}
          <TabTrigger name="recurring" href="/recurring" asChild>
            <TabItem
              index={2}
              label="Recurring"
              icons={ICONS.recurring}
              badge={soon}
              a11yLabel={soon > 0 ? `Recurring, ${soon} coming up` : 'Recurring'}
            />
          </TabTrigger>
          <TabTrigger name="loans" href="/loans" asChild>
            <TabItem index={3} label="Loans" icons={ICONS.loans} />
          </TabTrigger>
        </GlassBar>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: PADDING,
    paddingHorizontal: PADDING,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tint: { ...StyleSheet.absoluteFill },
  thumb: {
    position: 'absolute',
    left: PADDING,
    top: PADDING,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  pressed: { opacity: 0.6 },
  icon: { width: 24, height: 24 },
  label: { fontSize: 12, fontWeight: '600', textShadowColor: '#00000099', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  labelSelected: { fontSize: 12, textShadowColor: '#00000099', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700' },
});
