import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { FocusInput } from '@/components/focus-input';
import { ActionSheet } from '@/components/action-sheet';
import { Button } from '@/components/button';
import { FieldError } from '@/components/field-error';
import { confirmRemovePayment, info } from '@/components/notices';
import { Sheet } from '@/components/sheet';
import { Numeric, ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, Touch } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useNow } from '@/hooks/use-now';
import { useSheetNotice } from '@/hooks/use-sheet-notice';
import { useTheme } from '@/hooks/use-theme';
import { shortDateLabel } from '@/lib/dates';
import { success } from '@/lib/haptics';
import {
  balanceCents,
  dueText,
  groupByPerson,
  isOverdue,
  isSettled,
  paidCents,
  reminderMessage,
  type Loan,
  type PersonGroup,
} from '@/lib/loans';
import { formatMoney, parseAmountToCents } from '@/lib/money';

type Props = {
  /** The person to show (their lowercase key). It stays set while the sheet slides away. */
  personKey: string;
  visible: boolean;
  onClose: () => void;
  onEditLoan: (loan: Loan) => void;
  onAddLoan: (person: string) => void;
};

/** What the person owes you or you owe them, and every loan with its payments. */
export function PersonSheet({ personKey, visible, onClose, onEditLoan, onAddLoan }: Props) {
  const { loans, currency } = useExpenses();
  const now = useNow();
  const { notify, sheetProps } = useSheetNotice();
  const display = groupByPerson(loans, now).find((g) => g.key === personKey);

  // The last loan was deleted from elsewhere: nothing left to show.
  useEffect(() => {
    if (visible && !display) onClose();
  }, [visible, display, onClose]);

  const message = display ? reminderMessage(display, currency) : null;

  async function sendReminder(text: string) {
    try {
      await Share.share({ message: text });
    } catch (error) {
      console.warn('Could not share the reminder', error);
      notify(info('Could not share', 'Please try again.'));
    }
  }

  return (
    <Sheet visible={visible} title={display?.person ?? ''} onClose={onClose}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {display && (
          <>
            <Balance group={display} currency={currency} />
            <View style={styles.actions}>
              <Button label="Add another loan" variant="secondary" onPress={() => onAddLoan(display.person)} />
              {message && <Button label="Send a reminder" variant="secondary" onPress={() => void sendReminder(message)} />}
            </View>
            {display.loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                now={now}
                currency={currency}
                onEdit={() => onEditLoan(loan)}
                notify={notify}
              />
            ))}
          </>
        )}
      </ScrollView>
      <ActionSheet {...sheetProps} />
    </Sheet>
  );
}

function Balance({ group, currency }: { group: PersonGroup; currency: string }) {
  const settled = group.openCount === 0;
  const text = settled
    ? 'All settled'
    : group.netCents > 0
      ? `${group.person} owes you`
      : `You owe ${group.person}`;
  return (
    <ThemedView type="backgroundElement" blur style={styles.balance}>
      <ThemedText type="small" themeColor="textSecondary">
        {text}
      </ThemedText>
      {!settled && (
        <ThemedText type="display" style={Numeric} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(Math.abs(group.netCents), currency)}
        </ThemedText>
      )}
      {!settled && group.netCents === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          What each owes the other cancels out.
        </ThemedText>
      )}
    </ThemedView>
  );
}

type CardProps = {
  loan: Loan;
  now: number;
  currency: string;
  onEdit: () => void;
  notify: ReturnType<typeof useSheetNotice>['notify'];
};

function LoanCard({ loan, now, currency, onEdit, notify }: CardProps) {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const { addPayment, deletePayment } = useExpenses();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);

  const paid = paidCents(loan);
  const balance = balanceCents(loan);
  const settled = isSettled(loan);
  const overdue = isOverdue(loan, now);
  const due = dueText(loan, now);
  const share = Math.min(1, paid / loan.amountCents);

  async function pay(cents: number) {
    if (busy.current) return;
    busy.current = true;
    try {
      await addPayment(loan.id, cents, now);
      setAmount('');
      setError('');
      success();
    } catch (failure) {
      console.warn('Could not record the payment', failure);
      notify(info('Could not save', 'Please try again.'));
    } finally {
      busy.current = false;
    }
  }

  function submit() {
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setError('Enter an amount greater than 0');
      return;
    }
    if (cents > balance) {
      setError(`Only ${formatMoney(balance, currency)} is left`);
      return;
    }
    void pay(cents);
  }

  function askRemove(id: number) {
    notify(
      confirmRemovePayment(() => {
        deletePayment(id).catch((failure) => {
          console.warn('Could not remove the payment', failure);
          notify(info('Could not remove', 'Please try again.'));
        });
      })
    );
  }

  return (
    <ThemedView type="backgroundElement" blur style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {loan.direction === 'lent' ? 'You lent' : 'You borrowed'} · {shortDateLabel(loan.createdAt)}
          </ThemedText>
          {loan.note ? <ThemedText numberOfLines={2}>{loan.note}</ThemedText> : null}
        </View>
        <ThemedText type="defaultBold" style={Numeric}>
          {formatMoney(loan.amountCents, currency)}
        </ThemedText>
      </View>

      <View
        accessible
        accessibilityLabel={`${formatMoney(paid, currency)} paid back of ${formatMoney(loan.amountCents, currency)}`}
        style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { backgroundColor: theme.accent, width: `${Math.round(share * 100)}%` }]} />
      </View>
      <View style={styles.cardTop}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          {settled ? 'Paid in full' : `${formatMoney(paid, currency)} paid · ${formatMoney(balance, currency)} left`}
        </ThemedText>
        {due ? (
          <ThemedText type="smallBold" themeColor={overdue ? 'danger' : 'textSecondary'}>
            {loan.remind ? '🔔 ' : ''}
            {due}
          </ThemedText>
        ) : null}
      </View>

      {loan.payments.length > 0 && (
        <View style={styles.payments}>
          {loan.payments.map((payment) => (
            <View key={payment.id} style={styles.paymentRow}>
              <ThemedText type="small" style={styles.flex}>
                Paid {shortDateLabel(payment.paidAt)}
              </ThemedText>
              <ThemedText type="smallBold" style={Numeric}>
                {formatMoney(payment.amountCents, currency)}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove the ${formatMoney(payment.amountCents, currency)} payment`}
                onPress={() => askRemove(payment.id)}
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
                <ThemedText themeColor="textSecondary">✕</ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {!settled && (
        <View style={styles.pay}>
          <FocusInput
            style={[inputStyle, styles.payInput]}
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              setError('');
            }}
            keyboardType="decimal-pad"
            placeholder={currency ? `Payment (${currency})` : 'Payment'}
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Payment amount"
            onSubmitEditing={submit}
          />
          <Button label="Add" onPress={submit} style={styles.payButton} />
        </View>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
      <View style={styles.cardActions}>
        {!settled && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void pay(balance)}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <ThemedText type="linkPrimary">Paid in full</ThemedText>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <ThemedText type="linkPrimary">Edit</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  balance: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.one },
  actions: { gap: Spacing.two },
  card: { borderRadius: Radius.row, padding: Spacing.three, gap: Spacing.two },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: Radius.pill },
  payments: { gap: Spacing.half },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  remove: { width: Touch.min, height: Touch.min, alignItems: 'center', justifyContent: 'center' },
  pay: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  payInput: { flex: 1 },
  payButton: { minWidth: 88 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.three },
  link: { minHeight: Touch.min, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
