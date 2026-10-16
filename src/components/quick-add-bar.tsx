import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { VoiceSheet } from '@/components/voice-sheet';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useTheme } from '@/hooks/use-theme';
import { parseReceipt, type Draft } from '@/lib/quick-entry';
import { readReceiptLines } from '@/lib/receipt-ocr';

type Props = {
  /** Called with whatever could be read; the add form fills itself in and the user confirms. */
  onDraft: (draft: Draft) => void;
};

/** "Say it" and "Scan receipt" shortcuts that pre-fill the add-expense form. */
export function QuickAddBar({ onDraft }: Props) {
  const theme = useTheme();
  const { categories } = useExpenses();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  async function scan() {
    if (scanning) return;
    setScanning(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera needed', 'Allow camera access in Settings to scan receipts.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const lines = await readReceiptLines(uri);
      if (lines) {
        setPhoto(null);
        onDraft(parseReceipt(lines, categories));
      } else {
        // No text-recognition engine in this build: keep the photo in view while the user types.
        setPhoto(uri);
      }
    } catch (error) {
      console.warn('Could not scan the receipt', error);
      Alert.alert('Could not scan', 'Something went wrong with the camera. Please try again.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setVoiceOpen(true)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">🎤  Say it</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={scan}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          {scanning ? <ActivityIndicator /> : <ThemedText type="smallBold">📷  Scan receipt</ThemedText>}
        </Pressable>
      </View>

      {photo ? (
        <View style={[styles.photoCard, { backgroundColor: theme.backgroundElement }]}>
          <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          <View style={styles.photoText}>
            <ThemedText type="smallBold">Receipt captured</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Reading the total automatically comes with the full app. For now, type it below.
            </ThemedText>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPhoto(null)}>
              <ThemedText type="linkPrimary">Dismiss</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      <VoiceSheet visible={voiceOpen} onClose={() => setVoiceOpen(false)} onUse={onDraft} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  button: {
    flex: 1,
    minHeight: Touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.two,
  },
  pressed: { opacity: 0.8 },
  photoCard: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.row },
  photo: { width: 72, height: 96, borderRadius: Spacing.two },
  photoText: { flex: 1, minWidth: 0, gap: Spacing.one },
});
