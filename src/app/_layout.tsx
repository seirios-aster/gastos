import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ThemeTransitionProvider } from '@/components/theme-transition';
import { UndoToast } from '@/components/undo-toast';
import { ExpensesProvider, useExpenses } from '@/context/expenses-context';
import { themeFor } from '@/hooks/use-theme';
import { useAccent } from '@/lib/accent-preference';
import { migrate } from '@/lib/db';
import { configureReminders } from '@/lib/reminders';
import { applySavedTheme } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();
applySavedTheme();
void configureReminders();

// The navigation themes paint a gray behind every screen (rgb(242,242,242) light, rgb(1,1,1) dark).
// Use the app's own background so nothing gray shows while the theme changes or a tab switches.
function navTheme(scheme: 'light' | 'dark', accent: string) {
  const colors = themeFor(scheme, accent);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.background, primary: colors.accent },
  };
}

/** Renders nothing until the data has loaded, so no screen flashes empty; the splash overlay covers the wait. */
function ReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = useExpenses();
  return ready ? children : null;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const accent = useAccent();
  return (
    <ThemeProvider value={navTheme(colorScheme === 'dark' ? 'dark' : 'light', accent)}>
      <SQLiteProvider databaseName="gastos.db" onInit={migrate}>
        <ExpensesProvider>
          <AnimatedSplashOverlay />
          <ReadyGate>
            <ThemeTransitionProvider>
              {/* Light icons on a dark screen and the other way round, following the app's theme. */}
              <StatusBar style="auto" />
              <AppTabs />
              <UndoToast />
            </ThemeTransitionProvider>
          </ReadyGate>
        </ExpensesProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
