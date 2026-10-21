import { StyleSheet, View } from 'react-native';

import { SettingsButton } from '@/components/settings-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Spacing } from '@/constants/theme';

/** The buttons at the top right of a screen: the light/dark toggle, then Settings. */
export function HeaderActions() {
  return (
    <View style={styles.row}>
      <ThemeToggle />
      <SettingsButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
