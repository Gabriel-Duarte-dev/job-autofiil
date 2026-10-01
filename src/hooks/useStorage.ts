import { useCallback, useEffect, useState } from 'react';

export function useStorage<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    browser.storage.local.get(key).then((result) => {
      if (cancelled) return;
      const stored = result[key] as T | undefined;
      if (stored !== undefined) setValue({ ...fallback, ...stored });
      setLoaded(true);
    });

    const onChange: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      area,
    ) => {
      if (area !== 'local' || !changes[key]) return;
      const next = changes[key].newValue as T | undefined;
      setValue(next === undefined ? fallback : { ...fallback, ...next });
    };

    browser.storage.onChanged.addListener(onChange);
    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(onChange);
    };
  }, [key]);

  const update = useCallback(
    async (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        void browser.storage.local.set({ [key]: resolved });
        return resolved;
      });
    },
    [key],
  );

  return [value, update, loaded] as const;
}
