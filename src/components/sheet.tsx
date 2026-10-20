import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlowBackground } from '@/components/glow-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, Touch } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** A full-height bottom sheet (iOS page sheet / Android full-screen modal) with a title bar. */
export function Sheet({ visible, title, onClose, children }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <GlowBackground />
        <SafeAreaView
          style={styles.flex}
          edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['bottom']}>
          {/* On a wide screen (a tablet, a folded phone) the content stays a readable width. */}
          <View style={styles.column}>
            <View style={styles.header}>
              <ThemedText type="heading" accessibilityRole="header" style={styles.title}>
                {title}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
                <ThemedText type="linkPrimary">Close</ThemedText>
              </Pressable>
            </View>
            {children}
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  title: { flex: 1 },
  close: {
    minWidth: Touch.min,
    minHeight: Touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
