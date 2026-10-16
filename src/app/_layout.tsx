import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { UndoToast } from '@/components/undo-toast';
import { ExpensesProvider, useExpenses } from '@/context/expenses-context';
import { migrate } from '@/lib/db';
import { applySavedTheme } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();
applySavedTheme();

/** Renders nothing until the data has loaded, so no screen flashes empty; the splash overlay covers the wait. */
function ReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = useExpenses();
  return ready ? children : null;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName="gastos.db" onInit={migrate}>
        <ExpensesProvider>
          <AnimatedSplashOverlay />
          <ReadyGate>
            <AppTabs />
            <UndoToast />
          </ReadyGate>
        </ExpensesProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
