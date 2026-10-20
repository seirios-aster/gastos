import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing, Touch } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SheetAction = {
  label: string;
  /** A short second line under the label. */
  description?: string;
  /** Shown in the danger color, for actions that remove something. */
  destructive?: boolean;
  onPress: () => void;
};

/** What a screen keeps in state to show a message or confirmation in a sheet. */
export type SheetNotice = {
  title: string;
  message?: string;
  /** Leave out for a plain message that is only dismissed. */
  actions?: SheetAction[];
  /** The dismiss button's text; defaults to "Cancel". */
  cancelLabel?: string;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  /** The dismiss button's text; use "OK" for a plain message. */
  cancelLabel?: string;
  onClose: () => void;
};

/**
 * A small choice sheet that slides up from the bottom, in the app's own theme (the system alert
 * is always light and ignores dark mode). Tapping outside it, the Cancel button or the Android
 * Back button all close it without choosing anything.
 */
export function ActionSheet({ visible, title, message, actions, cancelLabel = 'Cancel', onClose }: Props) {
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
          // Almost solid: it sits over the dimmed screen, and text showing through would be hard to read.
          style={[
            styles.sheet,
            { backgroundColor: theme.toast, paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two },
          ]}>
          <ThemedText type="heading" accessibilityRole="header">
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
                  {
                    backgroundColor:
                      primary && !action.destructive ? theme.accent : theme.backgroundSelected,
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="smallBold"
                  themeColor={action.destructive ? 'danger' : primary ? 'onAccent' : 'text'}>
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
            accessibilityLabel={cancelLabel}
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {cancelLabel}
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
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  message: { marginBottom: Spacing.two },
  action: {
    alignItems: 'center',
    minHeight: Touch.button,
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: 2,
  },
  description: { textAlign: 'center' },
  cancel: { alignItems: 'center', paddingVertical: Spacing.three },
  pressed: { opacity: 0.8 },
});
