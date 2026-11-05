// Pure React Clock Hook — avoids calling `new Date()` directly inside component render functions
// and keeps 48-hour follow-up indicators live.

import { useState, useEffect } from 'react';

export function useNow(intervalMs = 60000) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return nowMs;
}

