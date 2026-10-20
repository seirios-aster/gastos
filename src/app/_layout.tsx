import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ThemeTransitionProvider } from '@/components/theme-transition';
import { UndoToast } from '@/components/undo-toast';
import { ExpensesProvider, useExpenses } from '@/context/expenses-context';
import { Colors } from '@/constants/colors';
import { migrate } from '@/lib/db';
import { configureReminders } from '@/lib/reminders';
import { applySavedTheme, useThemeChoice } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();
applySavedTheme();
void configureReminders();

// The navigation themes paint a gray behind every screen (rgb(242,242,242) light, rgb(1,1,1) dark).
// Use the app's own background so nothing gray shows while the theme changes or a tab switches.
function navTheme(choice: 'light' | 'dark' | 'glass') {
  const colors = Colors[choice];
  const base = choice === 'light' ? DefaultTheme : DarkTheme;
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
  const choice = useThemeChoice();
  return (
    <ThemeProvider value={navTheme(choice)}>
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
