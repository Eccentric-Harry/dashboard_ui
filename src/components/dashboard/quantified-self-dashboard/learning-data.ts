export const LEARNING_CATEGORIES = ['All', 'GitHub', 'Development', 'AI', 'DevOps'] as const;
export type LearningCategory = typeof LEARNING_CATEGORIES[number];

export interface LearningLog {
  date: string;
  topic: string;
  intensity: number; // 1 to 4
  category: Exclude<LearningCategory, 'All'>;
}

const categories = ['GitHub', 'Development', 'AI', 'DevOps'] as const;

// Seeded-like data to avoid re-randomizing on every render
const generateMockLearnings = (): LearningLog[] => {
  const logs: LearningLog[] = [];
  const today = new Date();

  for (let i = 363; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    // Use date-based pseudo-random for stability (no flicker on re-render)
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    const rand = ((seed * 9301 + 49297) % 233280) / 233280;

    let intensity: number = 0;
    if (rand > 0.82) intensity = 4;
    else if (rand > 0.65) intensity = 3;
    else if (rand > 0.48) intensity = 2;
    else if (rand > 0.30) intensity = 1;

    if (intensity > 0) {
      const catIndex = Math.floor(((seed * 6364136223846793005 + 1442695040888963407) >>> 0) % 4);
      logs.push({
        date: dateString,
        topic: 'Learning session',
        intensity,
        category: categories[catIndex],
      });
    }
  }
  return logs;
};

export const learningLogs: LearningLog[] = generateMockLearnings();

export const getIntensityForDay = (daysAgo: number, categoryFilter: LearningCategory = 'All'): number => {
  const today = new Date();
  const date = new Date(today);
  date.setDate(today.getDate() - daysAgo);
  const dateString = date.toISOString().split('T')[0];

  const log = learningLogs.find(
    l => l.date === dateString && (categoryFilter === 'All' || l.category === categoryFilter)
  );
  return log ? log.intensity : 0;
};

export const getIsoDateStringForDay = (daysAgo: number): string => {
  const today = new Date();
  const date = new Date(today);
  date.setDate(today.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

export const getDateStringForDay = (daysAgo: number): string => {
  const today = new Date();
  const date = new Date(today);
  date.setDate(today.getDate() - daysAgo);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
