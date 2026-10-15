import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FieldError } from '@/components/field-error';
import { Section } from '@/components/settings/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/expenses-context';
import { useInputStyle } from '@/hooks/use-input-style';
import { useTheme } from '@/hooks/use-theme';
import { OTHER_CATEGORY_ID } from '@/lib/expenses';

const DEFAULT_EMOJI = '🏷️';

export function CategoriesSection() {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const { categories, addCategory, deleteCategory } = useExpenses();
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const adding = useRef(false);

  async function add() {
    if (adding.current) return;
    const label = name.trim();
    if (!label) {
      setError('Give the category a name');
      return;
    }
    if (categories.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
      setError('You already have a category with that name');
      return;
    }
    adding.current = true;
    try {
      await addCategory(label, emoji.trim() || DEFAULT_EMOJI);
      setName('');
      setEmoji('');
      setError('');
    } catch (failure) {
      console.warn('Could not add category', failure);
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      adding.current = false;
    }
  }

  function confirmDelete(id: string, label: string) {
    Alert.alert(`Delete “${label}”?`, 'Its expenses will move to “Other”.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteCategory(id) },
    ]);
  }

  return (
    <Section title="Categories" hint="Add your own, or remove the ones you don't use.">
      <View style={styles.chips}>
        {categories.map((category) => (
          <View
            key={category.id}
            style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">
              {category.emoji} {category.label}
            </ThemedText>
            {category.id !== OTHER_CATEGORY_ID && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${category.label}`}
                hitSlop={8}
                onPress={() => confirmDelete(category.id, category.label)}
                style={styles.deleteButton}>
                <ThemedText type="small" themeColor="textSecondary">
                  ✕
                </ThemedText>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={[inputStyle, styles.emojiInput]}
          value={emoji}
          onChangeText={setEmoji}
          maxLength={8}
          placeholder={DEFAULT_EMOJI}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Category emoji"
        />
        <TextInput
          style={[inputStyle, styles.nameInput]}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError('');
          }}
          maxLength={20}
          placeholder="New category name"
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Pressable
          accessibilityRole="button"
          onPress={add}
          style={[styles.addButton, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" themeColor="onAccent">
            Add
          </ThemedText>
        </Pressable>
      </View>
      {error ? <FieldError>{error}</FieldError> : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  // The negative margin lets the 44dp target overlap the chip's padding instead of growing the chip.
  deleteButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    margin: -Spacing.two,
  },
  addRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  emojiInput: { minWidth: 60, textAlign: 'center' },
  nameInput: { flex: 1, minWidth: 0 },
  addButton: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
  },
});
