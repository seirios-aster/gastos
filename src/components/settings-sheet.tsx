import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Sheet } from '@/components/sheet';
import { BudgetSection } from '@/components/settings/budget-section';
import { CategoriesSection } from '@/components/settings/categories-section';
import { CurrencySection } from '@/components/settings/currency-section';
import { DataSection } from '@/components/settings/data-section';
import { RecurringSection } from '@/components/settings/recurring-section';
import { Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsSheet({ visible, onClose }: Props) {
  return (
    <Sheet visible={visible} title="Settings" onClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <CurrencySection />
          <BudgetSection />
          <CategoriesSection />
          <RecurringSection />
          <DataSection />
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
});
