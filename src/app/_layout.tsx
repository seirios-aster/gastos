import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ExpensesProvider } from '@/context/expenses-context';
import { migrate } from '@/lib/db';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName="gastos.db" onInit={migrate}>
        <ExpensesProvider>
          <AnimatedSplashOverlay />
          <AppTabs />
        </ExpensesProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
