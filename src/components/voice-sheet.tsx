import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';
import { getCategory } from '@/lib/expenses';
import { formatMoney } from '@/lib/money';
import { parseSpoken, type Draft } from '@/lib/quick-entry';
import { loadSpeech } from '@/lib/speech';

type Props = {
  visible: boolean;
  onClose: () => void;
  onUse: (draft: Draft) => void;
};

/**
 * Say or type an expense in one sentence ("lunch 150", "grab 85 pesos"). Builds that include the
 * speech engine get a mic button; everywhere else the text box works with the keyboard's own mic.
 * Either way it shows live how the sentence will be read.
 */
export function VoiceSheet({ visible, onClose, onUse }: Props) {
  const theme = useTheme();
  const { categories, currency } = useExpenses();
  const speech = loadSpeech();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!speech) return;
    const { ExpoSpeechRecognitionModule: recognizer } = speech;
    const subscriptions = [
      recognizer.addListener('start', () => setListening(true)),
      recognizer.addListener('end', () => setListening(false)),
      recognizer.addListener('result', (event) => setText(event.results[0]?.transcript ?? '')),
      recognizer.addListener('error', (event) => {
        setListening(false);
        if (event.error === 'aborted') return;
        setNotice(
          event.error === 'not-allowed'
            ? 'Microphone access is off for Gastos. Turn it on in Settings → Apps → Gastos → Permissions.'
            : event.error === 'no-speech'
              ? "Didn't catch that. Tap the mic and try again, or type it."
              : 'Voice input failed. You can type it instead.'
        );
      }),
    ];
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      recognizer.abort();
    };
  }, [speech]);

  async function toggleMic() {
    if (!speech) return;
    const { ExpoSpeechRecognitionModule: recognizer } = speech;
    if (listening) {
      recognizer.stop();
      return;
    }
    setNotice(null);
    const permission = await recognizer.requestPermissionsAsync();
    if (!permission.granted) {
      setNotice('Microphone access is off for Gastos. Turn it on in Settings → Apps → Gastos → Permissions.');
      return;
    }
    recognizer.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      contextualStrings: ['pesos', ...categories.map((c) => c.label)],
    });
  }

  function close() {
    speech?.ExpoSpeechRecognitionModule.abort();
    setText('');
    setNotice(null);
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
            {speech
              ? 'Tap the mic and say something like “lunch 150” or “grab 85 pesos”. You can also type.'
              : 'Type or tap the 🎤 on your keyboard and say something like “lunch 150” or “grab 85 pesos”.'}
          </ThemedText>

          {speech ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop listening' : 'Start listening'}
              onPress={toggleMic}
              style={({ pressed }) => [
                styles.mic,
                { backgroundColor: listening ? theme.backgroundSelected : theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor={listening ? 'text' : 'onAccent'}>
                {listening ? '⏹  Listening… tap to stop' : '🎤  Tap to speak'}
              </ThemedText>
            </Pressable>
          ) : null}
          {notice ? (
            <ThemedText type="small" themeColor="textSecondary">
              {notice}
            </ThemedText>
          ) : null}

          <TextInput
            autoFocus={!speech}
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
              <ThemedText type="subtitle" style={styles.amount}>
                {ready ? formatMoney(draft.amountCents!, currency) : 'No amount yet'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {getCategory(categories, draft.category).emoji}{' '}
                {getCategory(categories, draft.category).label}
                {draft.title ? ` · ${draft.title}` : ''}
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!ready}
            onPress={use}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.accent },
              !ready && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor="onAccent">
              Use this
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  mic: {
    alignItems: 'center',
    borderRadius: Spacing.three - 4,
    paddingVertical: Spacing.three,
  },
  input: {
    borderRadius: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 18,
  },
  preview: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  amount: { fontSize: 28, lineHeight: 36 },
  button: {
    alignItems: 'center',
    borderRadius: Spacing.three - 4,
    paddingVertical: Spacing.three - 2,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
