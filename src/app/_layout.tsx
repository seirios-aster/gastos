import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ThemeTransitionProvider } from '@/components/theme-transition';
import { UndoToast } from '@/components/undo-toast';
import { Colors } from '@/constants/theme';
import { ExpensesProvider, useExpenses } from '@/context/expenses-context';
import { migrate } from '@/lib/db';
import { configureReminders } from '@/lib/reminders';
import { applySavedTheme } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();
applySavedTheme();
void configureReminders();

// The navigation themes paint a gray behind every screen (rgb(242,242,242) light, rgb(1,1,1) dark).
// Use the app's own background so nothing gray shows while the theme changes or a tab switches.
const NavLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background,
    primary: Colors.light.accent,
  },
};
const NavDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    primary: Colors.dark.accent,
  },
};

/** Renders nothing until the data has loaded, so no screen flashes empty; the splash overlay covers the wait. */
function ReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = useExpenses();
  return ready ? children : null;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? NavDark : NavLight}>
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
