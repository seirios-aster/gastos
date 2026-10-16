import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { SettingsSheet } from '@/components/settings-sheet';
import { Touch } from '@/constants/theme';
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
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
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
  button: { minWidth: Touch.min, minHeight: Touch.min, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
