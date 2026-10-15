import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { SettingsSheet } from '@/components/settings-sheet';
import { useTheme } from '@/hooks/use-theme';

/** The gear that opens Settings, together with the sheet it opens. */
export function SettingsButton() {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={12}
        onPress={() => setVisible(true)}
        style={styles.button}>
        <SymbolView
          tintColor={theme.text}
          name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
          size={24}
        />
      </Pressable>
      <SettingsSheet visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
