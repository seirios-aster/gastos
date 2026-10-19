import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { HeaderActions } from '@/components/header-actions';
import { LoanFormSheet, type LoanEditor } from '@/components/loans/loan-form-sheet';
import { LoansEmpty } from '@/components/loans/loans-empty';
import { PersonRow } from '@/components/loans/person-row';
import { PersonSheet } from '@/components/loans/person-sheet';
import { Segmented } from '@/components/segmented';
import { SummaryCard } from '@/components/summary-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useNow } from '@/hooks/use-now';
import { groupByPerson, summarizeLoans, type Loan } from '@/lib/loans';
import { formatMoney } from '@/lib/money';

type Filter = 'open' | 'settled';

export default function LoansScreen() {
  const now = useNow();
  const { loans, currency } = useExpenses();
  const [filter, setFilter] = useState<Filter>('open');
  // The person stays set while the sheet slides away, so it does not go blank.
  const [person, setPerson] = useState({ key: '', open: false });
  const [editor, setEditor] = useState<LoanEditor | null>(null);

  const totals = summarizeLoans(loans);
  const groups = groupByPerson(loans, now);
  const open = groups.filter((g) => g.openCount > 0);
  const settled = groups.filter((g) => g.openCount === 0);
  const shown = filter === 'open' ? open : settled;

  // A second sheet can't open over one that is already open, so wait for the first to slide away.
  function editLoan(loan: Loan) {
    setPerson((p) => ({ ...p, open: false }));
    setTimeout(() => setEditor({ mode: 'edit', loan }), 350);
  }
  function addLoanFor(person: string) {
    setPerson((p) => ({ ...p, open: false }));
    setTimeout(() => setEditor({ mode: 'new', person }), 350);
  }

  const summaryFooter =
    totals.youOweCents > 0
      ? `You owe ${formatMoney(totals.youOweCents, currency)}`
      : totals.openCount > 0
        ? `${totals.openCount} open ${totals.openCount === 1 ? 'loan' : 'loans'}`
        : 'Nothing open right now';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Lent and borrowed, kept apart from spending
              </ThemedText>
              <ThemedText type="subtitle" accessibilityRole="header">
                Loans
              </ThemedText>
            </View>
            <HeaderActions />
          </View>

          {loans.length === 0 ? (
            <LoansEmpty onAdd={() => setEditor({ mode: 'new' })} />
          ) : (
            <>
              <SummaryCard
                label="Owed to you"
                amount={formatMoney(totals.owedToYouCents, currency)}
                footer={summaryFooter}
              />

              <Button label="New loan" onPress={() => setEditor({ mode: 'new' })} />

              <Segmented
                accessibilityLabel="Show"
                options={[
                  { value: 'open', label: `Open · ${open.length}` },
                  { value: 'settled', label: `Settled · ${settled.length}` },
                ]}
                value={filter}
                onChange={setFilter}
              />

              <View style={styles.list}>
                {shown.map((group) => (
                  <PersonRow
                    key={group.key}
                    group={group}
                    now={now}
                    currency={currency}
                    onPress={() => setPerson({ key: group.key, open: true })}
                  />
                ))}
                {shown.length === 0 && (
                  <ThemedText themeColor="textSecondary" style={styles.none}>
                    {filter === 'open' ? 'Everything is settled. 🎉' : 'Nothing settled yet.'}
                  </ThemedText>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <PersonSheet
        personKey={person.key}
        visible={person.open}
        onClose={() => setPerson((p) => ({ ...p, open: false }))}
        onEditLoan={editLoan}
        onAddLoan={addLoanFor}
      />
      <LoanFormSheet editor={editor} onClose={() => setEditor(null)} />
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
  none: { textAlign: 'center', paddingVertical: Spacing.four },
});
