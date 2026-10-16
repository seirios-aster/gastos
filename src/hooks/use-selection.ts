import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';

import { pruneIds, toggleId } from '@/lib/selection';

/**
 * Picking several items from a list to act on together (delete). `existingIds` are the ids the
 * screen is showing right now: anything picked that has since disappeared is dropped, so the
 * count is always about what is really there.
 *
 * Selecting is "on" while anything is picked, and turns itself off when the last one is
 * unpicked. The phone's Back button and leaving the tab both cancel it.
 */
export function useSelection(existingIds: number[]) {
  const [picked, setPicked] = useState<number[]>([]);
  const ids = useMemo(() => pruneIds(picked, existingIds), [picked, existingIds]);
  const selecting = ids.length > 0;

  const toggle = useCallback((id: number) => setPicked((prev) => toggleId(prev, id)), []);
  const clear = useCallback(() => setPicked([]), []);
  const selectAll = useCallback(() => setPicked(existingIds), [existingIds]);

  // Back cancels selecting instead of leaving the app.
  useEffect(() => {
    if (!selecting) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setPicked([]);
      return true;
    });
    return () => subscription.remove();
  }, [selecting]);

  // Switching to another tab leaves nothing half-picked behind.
  useFocusEffect(useCallback(() => () => setPicked([]), []));

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  return { ids, count: ids.length, selecting, has, toggle, clear, selectAll };
}
