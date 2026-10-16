import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { Button } from '@/components/button';
import { HeaderActions } from '@/components/header-actions';
import { NOTIFICATIONS_OFF, TEST_SENT, addedToday } from '@/components/recurring/notices';
import { RecurringEmpty } from '@/components/recurring/recurring-empty';
import { RecurringFormSheet, type Editor } from '@/components/recurring/recurring-form-sheet';
import { RecurringRow } from '@/components/recurring/recurring-row';
import { UpcomingCard } from '@/components/recurring/upcoming-card';
import { SummaryCard } from '@/components/summary-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useNow } from '@/hooks/use-now';
import { useSheetNotice } from '@/hooks/use-sheet-notice';
import { formatMoney } from '@/lib/money';
import { monthlyEquivalentCents, sortRecurring } from '@/lib/recurring';
import { sendTestReminder } from '@/lib/reminders';

export default function RecurringScreen() {
  const now = useNow();
  const { recurring, currency } = useExpenses();
  // Messages here use the app's own sheet (the system pop-up ignores dark mode). The form has its
  // own inside its sheet: a second modal can't open over one that is already open.
  const { notify, sheetProps } = useSheetNotice();
  const [editor, setEditor] = useState<Editor | null>(null);

  const sorted = sortRecurring(recurring);
  const active = sorted.filter((item) => !item.paused);
  const paused = sorted.filter((item) => item.paused);

  async function sendTest() {
    notify((await sendTestReminder()) ? TEST_SENT : NOTIFICATIONS_OFF);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Logged for you on the due day
              </ThemedText>
              <ThemedText type="subtitle" accessibilityRole="header">
                Recurring
              </ThemedText>
            </View>
            <HeaderActions />
          </View>

          {recurring.length === 0 ? (
            <RecurringEmpty onAdd={(template) => setEditor({ mode: 'new', template })} />
          ) : (
            <>
              <SummaryCard
                label="About each month"
                amount={formatMoney(monthlyEquivalentCents(recurring), currency)}
                footer={`${active.length} active${paused.length ? ` · ${paused.length} paused` : ''}`}
              />

              <UpcomingCard items={recurring} now={now} />

              <Button label="New recurring expense" onPress={() => setEditor({ mode: 'new' })} />

              {active.length > 0 && (
                <View style={styles.list}>
                  <ThemedText type="smallBold" accessibilityRole="header">
                    Active · {active.length}
                  </ThemedText>
                  {active.map((item) => (
                    <RecurringRow
                      key={item.id}
                      item={item}
                      now={now}
                      onPress={() => setEditor({ mode: 'edit', item })}
                    />
                  ))}
                </View>
              )}

              {paused.length > 0 && (
                <View style={styles.list}>
                  <ThemedText type="smallBold" accessibilityRole="header">
                    Paused · {paused.length}
                  </ThemedText>
                  {paused.map((item) => (
                    <RecurringRow
                      key={item.id}
                      item={item}
                      now={now}
                      onPress={() => setEditor({ mode: 'edit', item })}
                    />
                  ))}
                  <ThemedText type="small" themeColor="textSecondary">
                    Nothing is logged while paused. Resuming doesn&apos;t add the days you missed.
                  </ThemedText>
                </View>
              )}

              {active.some((item) => item.remindDays !== null) && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void sendTest()}
                  style={styles.link}>
                  <ThemedText type="smallBold" themeColor="accent">
                    Send a test notification
                  </ThemedText>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <RecurringFormSheet
        editor={editor}
        onClose={() => setEditor(null)}
        onAdded={({ label, dueToday }) => {
          // Wait for the form sheet to slide away; two modals shouldn't overlap.
          if (dueToday) setTimeout(() => notify(addedToday(label)), 350);
        }}
      />
      <ActionSheet {...sheetProps} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.three,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { gap: Spacing.two },
  link: { minHeight: Touch.min, alignItems: 'center', justifyContent: 'center' },
});
