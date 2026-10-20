import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Segmented } from '@/components/segmented';
import { GradientSlider } from '@/components/gradient-slider';
import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_ACCENT, hexToHsl, hslToHex } from '@/constants/accent';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resetAccent, setAccent, useAccent } from '@/lib/accent-preference';
import { setDarkTone, useDarkTone } from '@/lib/dark-tone-preference';
import { tick } from '@/lib/haptics';

/** Ready-made colors. The first is the default; each one is made readable in light and dark mode. */
const PRESETS = [
  { hex: DEFAULT_ACCENT, label: 'Sky' },
  { hex: '#9A9BFF', label: 'Indigo' },
  { hex: '#B196FF', label: 'Lavender' },
  { hex: '#4FD1C5', label: 'Teal' },
  { hex: '#6EDB9C', label: 'Mint' },
  { hex: '#F2C14E', label: 'Gold' },
  { hex: '#FFA27A', label: 'Peach' },
  { hex: '#FF8FB8', label: 'Rose' },
];

/** The lightness a mixed color starts from; the app adjusts it for each theme anyway. */
const MIX_LIGHTNESS = 0.72;
const MIN_VIVID = 0.25;

const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360].map((h) => hslToHex(h, 1, 0.6));

/** Pick the app's main color: a few presets, or mix your own. Lavender is the default. */
export function ColorSection() {
  const theme = useTheme();
  const accent = useAccent();
  const tone = useDarkTone();
  const preset = PRESETS.some((p) => p.hex === accent);
  const [mixing, setMixing] = useState(!preset);
  const [hue, saturation] = hexToHsl(accent);

  const choose = (hex: string) => {
    tick();
    setAccent(hex);
  };

  return (
    <Section
      title="Color"
      hint="The main color of the app: buttons, selected tabs and the big number card. It adjusts itself to stay readable in light and dark mode.">
      <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Main color">
        {PRESETS.map((p) => {
          const selected = p.hex === accent;
          return (
            <Pressable
              key={p.hex}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={p.hex === DEFAULT_ACCENT ? `${p.label}, default` : p.label}
              onPress={() => {
                choose(p.hex);
                setMixing(false);
              }}
              style={({ pressed }) => [
                styles.swatch,
                { backgroundColor: p.hex, borderColor: selected ? theme.text : 'transparent' },
                pressed && styles.pressed,
              ]}>
              {selected ? (
                <SymbolView
                  tintColor="#000000"
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={18}
                />
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: !preset }}
          accessibilityLabel="Mix your own"
          onPress={() => setMixing((open) => !open)}
          style={({ pressed }) => [
            styles.swatch,
            { backgroundColor: theme.backgroundSelected, borderColor: !preset ? theme.text : theme.fieldBorder },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            tintColor={theme.text}
            name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
            size={20}
          />
        </Pressable>
      </View>

      {mixing ? (
        <View style={styles.mixer}>
          <ThemedText type="small" themeColor="textSecondary">
            Color
          </ThemedText>
          <GradientSlider
            label="Color"
            value={hue / 360}
            colors={HUE_STOPS}
            onChange={(v) => setAccent(hslToHex(v * 360, Math.max(saturation, MIN_VIVID), MIX_LIGHTNESS))}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Vividness
          </ThemedText>
          <GradientSlider
            label="Vividness"
            value={(saturation - MIN_VIVID) / (1 - MIN_VIVID)}
            colors={[hslToHex(hue, MIN_VIVID, MIX_LIGHTNESS), hslToHex(hue, 1, MIX_LIGHTNESS)]}
            onChange={(v) => setAccent(hslToHex(hue, MIN_VIVID + v * (1 - MIN_VIVID), MIX_LIGHTNESS))}
          />
        </View>
      ) : null}

      {/* For trying the two dark looks side by side while testing; the released app does not show it. */}
      {__DEV__ ? (
        <View style={styles.mixer}>
          <ThemedText type="small" themeColor="textSecondary">
            Dark tone (testing only)
          </ThemedText>
          <Segmented
            accessibilityLabel="Dark tone"
            options={[
              { value: 'navy', label: 'Navy' },
              { value: 'slate', label: 'Slate' },
            ]}
            value={tone}
            onChange={setDarkTone}
          />
        </View>
      ) : null}

      {accent !== DEFAULT_ACCENT ? (
        <Button
          label="Back to the default"
          variant="secondary"
          onPress={() => {
            resetAccent();
            setMixing(false);
          }}
        />
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.mid },
  swatch: {
    width: Touch.min,
    height: Touch.min,
    borderRadius: Radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixer: { gap: Spacing.one },
  pressed: { opacity: 0.7 },
});
