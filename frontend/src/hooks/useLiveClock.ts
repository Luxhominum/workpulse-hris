'use client';

import { useState, useEffect } from 'react';

export function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeFormatted = now
    ? now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : '--:--:-- --';

  const dateFormatted = now
    ? now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '---, --- --, ----';

  return {
    now,
    timeFormatted,
    dateFormatted,
  };
}
