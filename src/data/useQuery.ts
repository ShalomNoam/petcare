import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Minimal data hook: loads on screen focus (so returning from a form shows
 * fresh data) and exposes `reload`. `deps` are the values `load` depends on.
 */
export function useQuery<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(deps);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setData(await load());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // `load` is recreated every render; it only changes meaningfully when `deps` do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, error, loading, reload };
}
