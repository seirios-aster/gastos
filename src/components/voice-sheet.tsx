import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Numeric, ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';
import { getCategory } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import { parseSpoken, type Draft } from '@/lib/quick-entry';

type Props = {
  visible: boolean;
  onClose: () => void;
  onUse: (draft: Draft) => void;
};

/**
 * Say or type an expense in one sentence ("lunch 150", "grab 85 pesos"). The text box works with
 * the keyboard's own microphone key, and shows live how the sentence will be read.
 */
export function VoiceSheet({ visible, onClose, onUse }: Props) {
  const theme = useTheme();
  const { categories, currency } = useExpenses();
  const [text, setText] = useState('');

  function close() {
    setText('');
    onClose();
  }

  const draft = parseSpoken(text, categories);
  const ready = draft.amountCents !== null;

  function use() {
    if (!ready) return;
    onUse(draft);
    close();
  }

  return (
    <Sheet visible={visible} title="Say it" onClose={close}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <ThemedText themeColor="textSecondary">
            Type or tap the 🎤 on your keyboard and say something like “lunch 150” or “grab 85
            pesos”.
          </ThemedText>
          <TextInput
            autoFocus
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            value={text}
            onChangeText={setText}
            placeholder="lunch 150"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="done"
            onSubmitEditing={use}
            accessibilityLabel="Describe the expense"
          />

          {text.trim() ? (
            <View style={[styles.preview, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                I understood
              </ThemedText>
              <ThemedText type="heading" style={Numeric}>
                {ready ? formatMoney(draft.amountCents!, currency) : 'No amount yet'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {getCategory(categories, draft.category).emoji}{' '}
                {getCategory(categories, draft.category).label}
                {draft.title ? ` · ${draft.title}` : ''}
              </ThemedText>
            </View>
          ) : null}

          <Button label="Use this" disabled={!ready} onPress={use} />
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  input: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  preview: { borderRadius: Radius.row, padding: Spacing.three, gap: Spacing.one },
});
