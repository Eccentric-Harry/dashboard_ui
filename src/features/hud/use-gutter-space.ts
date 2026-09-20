// How much room is left beside the stage, measured rather than assumed.
//
// `.dashboard-stage` is a fixed 1200px centred in a viewport-sized shell, so the
// spare width either side is exactly (viewport - 1200) / 2 — but `html { zoom }`
// (index.css) scales that viewport, and the zoom itself is a function of both
// window dimensions. Rather than re-derive it here and drift the moment those
// curves change, the gutter element is given the CSS calc and then measures
// itself: ResizeObserver reports an element's own CSS pixels, which is the unit
// the HUD's type and spacing are in.

import { useLayoutEffect, useState, type RefObject } from 'react';

export interface GutterSize {
  width: number;
  height: number;
}

export function useElementSize(ref: RefObject<HTMLElement | null>): GutterSize {
  const [size, setSize] = useState<GutterSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Seeded synchronously rather than waiting for the observer's first callback.
    // ResizeObserver delivers inside the rendering steps, which a browser is free
    // to skip entirely while the tab is hidden — a dashboard restored into a
    // background tab would then sit at width 0 and render no HUD at all until
    // something resized. clientWidth/clientHeight are the same unit the observer
    // reports (the element's own CSS pixels, not the zoom-scaled device pixels a
    // bounding rect gives), so the two agree.
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();

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
    // The gutter's size is a function of the viewport and nothing else, so this
    // covers every case the observer might miss.
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref]);

  return size;
}

/**
 * What fits in the band, measured rather than assumed — height as well as width.
 *
 * Width decides whether the column renders at all and, above a point, whether it
 * gets its roomy type or the narrow one. Height decides how many blocks it can
 * carry: a short-but-wide window has room for the columns but not for all of
 * them, and clipping one mid-row looks like a bug, so blocks drop in priority
 * order instead.
 *
 * Below MIN_WIDTH there is genuinely nowhere to put this. The stage is a fixed
 * 1200px that the whole route layout is tuned around, so the only way to make
 * room on a narrower window would be to take it from the cards.
 */
export type HudDensity = 'full' | 'compact' | 'minimal';

export interface HudFit {
  render: boolean;
  /** Narrow columns keep the blocks that matter, at a tighter type scale, and
      drop the few rows whose values are too wide to sit on one line. */
  narrow: boolean;
  density: HudDensity;
}

/** Narrower than this and the longest label+value row no longer fits on one line. */
const MIN_WIDTH = 190;
/** Above this the column can afford the roomy type scale and every row. */
const WIDE_WIDTH = 250;
/** The column's own insets inside the band — must match `.hud-column` in hud.css. */
const COLUMN_TOP_MAX = 161;
const COLUMN_TOP_MIN = 20;
const COLUMN_TOP_SLACK = 739;
const COLUMN_BOTTOM = 40;

/**
 * The height the stack actually gets, not the height of the band around it. The
 * column is inset to sit on the side rail's horizon, which on a short window is
 * most of a panel's worth of difference — measuring the band instead asks five
 * panels into a space that only holds four.
 */
function columnHeight(bandHeight: number): number {
  const top = Math.min(COLUMN_TOP_MAX, Math.max(COLUMN_TOP_MIN, bandHeight - COLUMN_TOP_SLACK));
  return Math.max(0, bandHeight - top - COLUMN_BOTTOM);
}

export function fitFor({ width, height }: GutterSize): HudFit {
  const narrow = width < WIDE_WIDTH;
  const available = columnHeight(height);
  // Measured against the real stacks: 'full' is five panels, and asking for five
  // in less than this makes the flexible one shrink to nothing before the others
  // have given anything up. A narrow column runs taller for the same content, so
  // it clears a higher bar for the same tier.
  const full = narrow ? 820 : 740;
  const compact = narrow ? 620 : 560;
  return {
    render: width >= MIN_WIDTH,
    narrow,
    density: available >= full ? 'full' : available >= compact ? 'compact' : 'minimal',
  };
}
