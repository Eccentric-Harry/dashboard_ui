// A clock that ticks on the second boundary rather than every 1000ms from mount:
// a plain interval drifts, so the seconds digit visibly stutters and skips. It
// also stands still while the tab is hidden and resyncs on the way back, so a
// backgrounded dashboard is not scheduling a render a second for hours.

import { useEffect, useState } from 'react';

export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer = 0;

    const scheduleNextTick = () => {
      const msToNextSecond = 1000 - (Date.now() % 1000);
      timer = window.setTimeout(() => {
        setNow(new Date());
        scheduleNextTick();
      }, msToNextSecond);
    };

    const onVisibility = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      setNow(new Date());
      scheduleNextTick();
    };

    scheduleNextTick();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return now;
}
