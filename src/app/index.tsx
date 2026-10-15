import { useState } from 'react';
import {
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Expense = {
  id: string;
  title: string;
  amount: number;
};

export default function HomeScreen() {
  const theme = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  function addExpense() {
    const value = parseFloat(amount.replace(',', '.'));
    if (!title.trim() || isNaN(value)) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      title: title.trim(),
      amount: value,
    };
    setExpenses([newExpense, ...expenses]);
    setTitle('');
    setAmount('');
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedText themeColor="textSecondary" type="small">
            Total spent
          </ThemedText>
          <ThemedText type="subtitle" style={styles.total}>
            ${total.toFixed(2)}
          </ThemedText>

          <View style={styles.form}>
            <TextInput
              style={inputStyle}
              value={title}
              onChangeText={setTitle}
              placeholder="What did you buy?"
              placeholderTextColor={theme.textSecondary}
            />
            <TextInput
              style={inputStyle}
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              onSubmitEditing={addExpense}
            />
            <Button title="Add expense" onPress={addExpense} />
          </View>

          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={styles.row}>
                <ThemedText>{item.title}</ThemedText>
                <ThemedText>${item.amount.toFixed(2)}</ThemedText>
              </ThemedView>
            )}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                No expenses yet
              </ThemedText>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset,
    maxWidth: MaxContentWidth,
  },
  total: {
    marginBottom: Spacing.three,
  },
  form: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    fontSize: 16,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
