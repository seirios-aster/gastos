import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SheetAction = {
  label: string;
  /** A short second line under the label. */
  description?: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
};

/**
 * A small choice sheet that slides up from the bottom, in the app's own theme (the system alert
 * is always light and ignores dark mode). Tapping outside it, the Cancel button or the Android
 * Back button all close it without choosing anything.
 */
export function ActionSheet({ visible, title, message, actions, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
        <ThemedView
          type="backgroundElement"
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two }]}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {message ? (
            <ThemedText themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
          ) : null}

          {actions.map((action, index) => {
            const primary = index === 0;
            return (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={() => {
                  // Close first so a system picker or share sheet isn't opened over this modal.
                  onClose();
                  setTimeout(action.onPress, 300);
                }}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: primary ? theme.accent : theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor={primary ? 'onAccent' : 'text'}>
                  {action.label}
                </ThemedText>
                {action.description ? (
                  <ThemedText
                    type="small"
                    themeColor={primary ? 'onAccent' : 'textSecondary'}
                    style={styles.description}>
                    {action.description}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  title: { fontSize: 24, lineHeight: 32 },
  message: { marginBottom: Spacing.two },
  action: {
    alignItems: 'center',
    borderRadius: Spacing.three - 4,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three,
    gap: 2,
  },
  description: { textAlign: 'center' },
  cancel: { alignItems: 'center', paddingVertical: Spacing.three },
  pressed: { opacity: 0.8 },
});
