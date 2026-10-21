import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { LiquidLayer } from '@/components/liquid-layer';
import { SettingsSheet } from '@/components/settings-sheet';
import { Radius } from '@/constants/theme';
import { useGlass } from '@/hooks/use-glass';
import { useTheme } from '@/hooks/use-theme';

/** The gear that opens Settings, together with the sheet it opens. */
export function SettingsButton() {
  const theme = useTheme();
  const glass = useGlass();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.backgroundElement, borderColor: theme.fieldBorder },
          glass.chip,
          pressed && styles.pressed,
        ]}>
        {/* In Glass the button is a small lens: the background bends along its edge. Nothing scrolls under it. */}
        <LiquidLayer
          lens
          radius={SIZE / 2}
          band={20}
          strength={20}
          tintFrom={theme.backgroundElement}
          tintTo={theme.backgroundElement}
        />
        <SymbolView
          tintColor={theme.textSecondary}
          name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
          size={24}
        />
      </Pressable>
      <SettingsSheet visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const SIZE = 46;

const styles = StyleSheet.create({
  // The same size and treatment as the look switch beside it: a 46dp round chip.
  button: {
    width: SIZE,
    height: SIZE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  pressed: { opacity: 0.6 },
});
