export function getTagColor(tag: string) {
  const standardColors: Record<string, { bg: string, text: string, dot: string }> = {
    'work': { bg: 'rgba(14, 165, 233, 0.12)', text: '#0369a1', dot: '#0ea5e9' },
    'learning': { bg: 'rgba(99, 102, 241, 0.12)', text: '#4338ca', dot: '#6366f1' },
    'fitness': { bg: 'rgba(249, 115, 22, 0.12)', text: '#c2410c', dot: '#f97316' },
    'shopping': { bg: 'rgba(217, 119, 6, 0.12)', text: '#b45309', dot: '#d97706' },
    'chores': { bg: 'rgba(168, 85, 247, 0.12)', text: '#7e22ce', dot: '#a855f7' },
    'finance': { bg: 'rgba(16, 185, 129, 0.12)', text: '#047857', dot: '#10b981' },
    'personal': { bg: 'rgba(139, 92, 246, 0.12)', text: '#6d28d9', dot: '#8b5cf6' },
    'general': { bg: 'rgba(20, 184, 166, 0.12)', text: '#0f766e', dot: '#14b8a6' },
    'dashboard': { bg: 'rgba(45, 60, 48, 0.08)', text: '#2d3c30', dot: '#2d3c30' }
  };

  const normalized = tag.toLowerCase().trim();
  if (standardColors[normalized]) {
    return standardColors[normalized];
  }

  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return {
    bg: `hsla(${h}, 85%, 50%, 0.12)`,
    text: `hsl(${h}, 85%, 35%)`,
    dot: `hsl(${h}, 85%, 50%)`
  };
}
