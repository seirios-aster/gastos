import { useState } from 'react';
import {  } from 'react-native';

import { FocusInput } from '@/components/focus-input';
import { Section } from '@/components/settings/section';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useTheme } from '@/hooks/use-theme';
import { centsToInput, parseAmountToCents } from '@/lib/money';

export function BudgetSection() {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const { budgetCents, setBudgetCents, currency } = useExpenses();
  const [text, setText] = useState(budgetCents > 0 ? centsToInput(budgetCents) : '');

  return (
    <Section
      title="Monthly budget"
      hint="A monthly limit, shown on Today and History. Leave empty for none.">
      <FocusInput
        style={inputStyle}
        value={text}
        onChangeText={(next) => {
          setText(next);
          if (next.trim() === '') setBudgetCents(0);
          else {
            const cents = parseAmountToCents(next);
            if (cents !== null) setBudgetCents(cents);
          }
        }}
        keyboardType="decimal-pad"
        placeholder={currency ? `${currency} per month` : 'Amount per month'}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Monthly budget"
      />
    </Section>
  );
}
