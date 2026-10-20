import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FocusInput } from '@/components/focus-input';
import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useGlass } from '@/hooks/use-glass';
import { useTheme } from '@/hooks/use-theme';
import { tick } from '@/lib/haptics';

const PRESETS = ['', '$', '€', '£', '¥', '₱', '₹', '₩', 'R$'];

export function CurrencySection() {
  const theme = useTheme();
  const glass = useGlass();
  const inputStyle = useInputStyle();
  const { currency, setCurrency } = useExpenses();
  const [custom, setCustom] = useState('');
  const isPreset = PRESETS.includes(currency);

  return (
    <Section
      title="Currency symbol"
      hint="Shown before amounts. Choose “None” for plain numbers.">
      <View style={styles.chips}>
        {PRESETS.map((symbol) => {
          const selected = symbol === currency;
          return (
            <Pressable
              key={symbol || 'none'}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                if (!selected) tick();
                setCurrency(symbol);
                setCustom('');
              }}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: selected ? theme.primaryFill : theme.backgroundElement },
                selected ? glass.selected : glass.chip,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'onPrimary' : 'text'}>
                {symbol || 'None'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <FocusInput
        style={inputStyle}
        value={isPreset ? custom : currency}
        onChangeText={(text) => {
          setCustom(text);
          setCurrency(text.trim());
        }}
        maxLength={4}
        placeholder="Or type your own (e.g. Fr)"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        accessibilityLabel="Your own currency symbol"
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    minWidth: 52,
    minHeight: Touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pressed: { opacity: 0.8 },
});
