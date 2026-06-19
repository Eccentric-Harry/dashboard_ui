export function getTagColor(tag: string) {
  const standardColors: Record<string, { bg: string, text: string, dot: string }> = {
    'work': { bg: 'hsla(210, 55%, 92%, 0.7)', text: '#1e40af', dot: '#2563eb' },
    'learning': { bg: 'hsla(175, 50%, 90%, 0.7)', text: '#0f766e', dot: '#0d9488' },
    'fitness': { bg: 'hsla(25, 55%, 90%, 0.7)', text: '#9a3412', dot: '#ea580c' },
    'health': { bg: 'hsla(340, 55%, 92%, 0.7)', text: '#9f1239', dot: '#e11d48' },
    'shopping': { bg: 'hsla(40, 50%, 90%, 0.7)', text: '#92400e', dot: '#d97706' },
    'chores': { bg: 'hsla(270, 50%, 92%, 0.7)', text: '#5b21b6', dot: '#7c3aed' },
    'finance': { bg: 'hsla(35, 50%, 90%, 0.7)', text: '#92400e', dot: '#d97706' },
    'personal': { bg: 'hsla(270, 50%, 92%, 0.7)', text: '#5b21b6', dot: '#7c3aed' },
    'general': { bg: 'hsla(170, 30%, 90%, 0.7)', text: '#166534', dot: '#16a34a' },
    'dashboard': { bg: 'hsla(140, 15%, 90%, 0.7)', text: '#3f3f46', dot: '#52525b' }
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
    bg: `hsla(${h}, 45%, 92%, 0.7)`,
    text: `hsl(${h}, 55%, 30%)`,
    dot: `hsl(${h}, 60%, 45%)`
  };
}
