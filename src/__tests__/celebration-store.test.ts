import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetCelebrationLedger } from '@/lib/celebration/ledger';
import { celebrationActions, useCelebrationStore } from '@/store/celebration-store';

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('celebration store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetCelebrationLedger();
    useCelebrationStore.setState({ moments: [] });
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays the first moment for a goal in full, then echoes by default', () => {
    const once = { key: 'hydration', scope: '2026-09-21' };
    expect(celebrationActions.celebrate({ label: 'Water goal met', once })).toBe('full');
    expect(celebrationActions.celebrate({ label: 'Water goal met', once })).toBe('echo');

    const [first, second] = useCelebrationStore.getState().moments;
    expect(first.announce).toBe('Water goal met');
    // An echo is a nod, not a second announcement.
    expect(second.announce).toBeNull();
  });

  it('honours repeat: full and repeat: skip', () => {
    const scope = '2026-09-21';
    celebrationActions.celebrate({ once: { key: 'protein', scope } });
    expect(celebrationActions.celebrate({ once: { key: 'protein', scope, repeat: 'full' } })).toBe('full');
    expect(celebrationActions.celebrate({ once: { key: 'protein', scope, repeat: 'skip' } })).toBe('skipped');
    expect(useCelebrationStore.getState().moments).toHaveLength(2);
  });

  it('starts fresh in a new scope, and remembers the scope across a reload', () => {
    celebrationActions.celebrate({ once: { key: 'hydration', scope: '2026-09-21' } });
    resetCelebrationLedger(); // what a page reload does to the in-memory cache
    expect(celebrationActions.celebrate({ once: { key: 'hydration', scope: '2026-09-21' } })).toBe('echo');
    expect(celebrationActions.celebrate({ once: { key: 'hydration', scope: '2026-09-22' } })).toBe('full');
  });

  it('spaces moments that arrive together', () => {
    celebrationActions.celebrate({ label: 'Protein goal met' });
    celebrationActions.celebrate({ label: 'Water goal met' });
    const [a, b] = useCelebrationStore.getState().moments;
    expect(b.startAt - a.startAt).toBeGreaterThanOrEqual(600);
  });

  it('under reduced motion keeps labelled moments (announcement only) and drops the rest', () => {
    mockReducedMotion(true);
    celebrationActions.celebrate({ label: 'Water goal met' });
    celebrationActions.celebrate({});
    const moments = useCelebrationStore.getState().moments;
    expect(moments).toHaveLength(1);
    expect(moments[0].reducedMotion).toBe(true);
  });
});
