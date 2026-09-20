// How much room is left beside the stage, measured rather than assumed.
//
// `.dashboard-stage` is a fixed 1200px centred in a viewport-sized shell, so the
// spare width either side is exactly (viewport - 1200) / 2 — but `html { zoom }`
// (index.css) scales that viewport, and the zoom itself is a function of both
// window dimensions. Rather than re-derive it here and drift the moment those
// curves change, the gutter element is given the CSS calc and then measures
// itself: ResizeObserver reports an element's own CSS pixels, which is the unit
// the HUD's type and spacing are in.

import { useEffect, useState, type RefObject } from 'react';

export interface GutterSize {
  width: number;
  height: number;
}

export function useElementSize(ref: RefObject<HTMLElement | null>): GutterSize {
  const [size, setSize] = useState<GutterSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // The box is sized by a calc() on the viewport, never by its contents, so
      // measuring it cannot feed back into its own size.
      const box = entry.contentBoxSize?.[0];
      setSize({
        width: box?.inlineSize ?? entry.contentRect.width,
        height: box?.blockSize ?? entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

/**
 * How much of each column fits. Height is measured for the same reason width is:
 * a short-but-wide window has room for the columns but not for every block, and
 * clipping one mid-row looks like a bug. Blocks drop in priority order instead.
 */
export type HudDensity = 'full' | 'compact' | 'minimal';

export function densityFor(height: number): HudDensity {
  if (height >= 700) return 'full';
  if (height >= 560) return 'compact';
  return 'minimal';
}
