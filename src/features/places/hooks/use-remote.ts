import { useEffect, useState } from 'react';

/** Loads `fetcher(key)` whenever `key` changes; null key clears it. */
export function useRemote<T>(key: string | null, fetcher: (key: string) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    if (!key) return;
    let live = true;
    setLoading(true);
    fetcher(key)
      .then((d) => (live ? setData(d) : undefined))
      .catch(() => (live ? setFailed(true) : undefined))
      .finally(() => (live ? setLoading(false) : undefined));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, failed };
}
