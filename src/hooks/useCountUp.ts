import { useEffect, useState } from 'react';

export function useCountUp(target: number, duration = 1200, start = true): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    let frame: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, start]);

  return value;
}
