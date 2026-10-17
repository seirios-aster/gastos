import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const SIZE = 24;

/** The round tick box shown on each row while picking several: filled with a check when picked. */
export function SelectMark({ selected }: { selected: boolean }) {
  const theme = useTheme();

  return (
    <View
      // The row itself says whether it is picked; this circle is only the picture of it.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        selected
          ? { backgroundColor: theme.accent, borderColor: theme.accent }
          : { borderColor: theme.textSecondary },
      ]}>
      {selected ? (
        <SymbolView
          tintColor={theme.onAccent}
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={16}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
