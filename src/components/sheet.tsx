import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

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
      onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView
          style={styles.flex}
          edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['bottom']}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              {title}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={onClose}>
              <ThemedText type="linkPrimary">Close</ThemedText>
            </Pressable>
          </View>
          {children}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  title: { fontSize: 24, lineHeight: 32 },
});
