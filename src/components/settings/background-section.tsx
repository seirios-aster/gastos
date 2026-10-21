import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { Button } from '@/components/button';
import { GradientSlider } from '@/components/gradient-slider';
import { info } from '@/components/notices';
import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useSheetNotice } from '@/hooks/use-sheet-notice';
import { useTheme } from '@/hooks/use-theme';
import {
  chooseBackground,
  removeBackground,
  setDim,
  useBackground,
} from '@/lib/background-preference';
import { MAX_DIM, MIN_DIM } from '@/lib/background-limits';

/** Pick a photo to sit behind every screen, and how much it is dimmed so text stays readable. */
export function BackgroundSection() {
  const theme = useTheme();
  const background = useBackground();
  const { notify, sheetProps } = useSheetNotice();
  const [busy, setBusy] = useState(false);

  async function choose() {
    if (busy) return;
    setBusy(true);
    try {
      await chooseBackground();
    } catch (error) {
      console.warn('Could not set the background', error);
      notify(info('Could not use that photo', 'Please try another one.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="Background"
      hint="A photo of your own behind every screen. The cards frost it like glass. Dim keeps the text easy to read.">
      {background.uri ? (
        <Image
          source={{ uri: background.uri }}
          recyclingKey={String(background.version)}
          cachePolicy="none"
          contentFit="cover"
          accessibilityLabel="Your background photo"
          style={[styles.preview, { borderColor: theme.fieldBorder }]}
        />
      ) : null}

      <Button

        icon="photo"
        label={background.uri ? 'Choose a different photo' : 'Choose a photo'}
        variant="secondary"
        onPress={() => void choose()}
        disabled={busy}
      />

      {background.uri ? (
        <>
          <View style={styles.dimRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Dim
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {Math.round(background.dim * 100)}%
            </ThemedText>
          </View>
          <GradientSlider
            label="Dim"
            value={(background.dim - MIN_DIM) / (MAX_DIM - MIN_DIM)}
            colors={[theme.backgroundSelected, theme.text]}
            onChange={(v) => setDim(MIN_DIM + v * (MAX_DIM - MIN_DIM))}
          />
          <Button icon="undo" label="Back to the default background" variant="secondary" onPress={removeBackground} />
        </>
      ) : null}
      <ActionSheet {...sheetProps} />
    </Section>
  );
}

const styles = StyleSheet.create({
  preview: { height: 160, borderRadius: Radius.row, borderWidth: 1 },
  dimRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.one },
});
