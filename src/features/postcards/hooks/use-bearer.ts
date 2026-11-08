import { useEffect, useState } from 'react';

import { getBearerToken } from '@/utils/api';

let cached: string | null = null;

/** The signed-in player's token, for images the API only serves to players. */
export function useBearer() {
  const [token, setToken] = useState<string | null>(cached);
  useEffect(() => {
    void getBearerToken().then((t) => {
      cached = t;
      setToken(t);
    });
  }, []);
  return token;
}
