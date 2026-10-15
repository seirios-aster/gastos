import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Current time in ms, refreshed every minute and when the app returns to the foreground. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);

  return now;
}
