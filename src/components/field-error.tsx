import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/** Error text that screen readers announce when it appears or changes. */
export function FieldError({ children }: { children: string }) {
  // Android announces live regions by itself; iOS needs an explicit announcement.
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(children);
  }, [children]);

  return (
    <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
      {children}
    </ThemedText>
  );
}
