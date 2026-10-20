import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useGlassRing } from '@/hooks/use-glass-ring';
import { useTheme } from '@/hooks/use-theme';
import { tick } from '@/lib/haptics';
import { RECURRING_TEMPLATES, type RecurringTemplate } from '@/lib/recurring-templates';

type Props = {
  onPick: (template: RecurringTemplate) => void;
  /** 'wrap' shows them all (empty state); 'row' is one scrolling line (inside the add form, to save height). */
  layout?: 'wrap' | 'row';
  /** What the chips sit on: a card (chips use the darker fill) or the bare screen. */
  surface?: 'screen' | 'card';
  /** For layout 'row': how far the line reaches past its padding on both sides. */
  bleed?: number;
};

/** One-tap starting points (Rent, Netflix, Allowance...). */
export function TemplateChips({ onPick, layout = 'wrap', surface = 'card', bleed = 0 }: Props) {
  const theme = useTheme();
  const ring = useGlassRing();
  const fill = surface === 'card' ? theme.backgroundSelected : theme.backgroundElement;

  const chips = RECURRING_TEMPLATES.map((template) => (
    <Pressable
      key={template.id}
      accessibilityRole="button"
      accessibilityLabel={`Start from ${template.title}`}
      onPress={() => {
        tick();
        onPick(template);
      }}
      style={({ pressed }) => [styles.chip, { backgroundColor: fill }, ring, pressed && styles.pressed]}>
      <ThemedText>{template.emoji}</ThemedText>
      <ThemedText type="smallBold">{template.title}</ThemedText>
    </Pressable>
  ));

  if (layout === 'row') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={bleed ? { marginHorizontal: -bleed } : undefined}
        contentContainerStyle={[styles.row, bleed ? { paddingHorizontal: bleed } : null]}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={styles.wrap}>{chips}</View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Touch.min,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.8 },
});
