import type {
  DailyTask,
  LearningsSummary,
  LearningLog,
  LearningPursuit,
  CalendarItem,
  CalendarRecurrence,
  DailyFinancialLog,
  FinancialTransaction,
  FinancialTotals,
  LendingRecord,
  RepaymentInstallment,
  StravaActivity,
  StravaActivityStats,
} from '../lib/api';

const today = new Date();
const todayIso = today.toISOString().split('T')[0];
const yesterday = new Date(today.getTime() - 86400000).toISOString().split('T')[0];

const seedRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const mealTemplates = [
  { name: "Overnight Oats with Berries", type: "Breakfast", baseCal: 380, basePro: 22, baseCarb: 52, baseFat: 10, time: "08:00 AM" },
  { name: "Greek Yogurt Bowl with Honey & Nuts", type: "Breakfast", baseCal: 320, basePro: 28, baseCarb: 35, baseFat: 12, time: "08:30 AM" },
  { name: "Protein Pancakes with Banana", type: "Breakfast", baseCal: 420, basePro: 30, baseCarb: 48, baseFat: 11, time: "09:00 AM" },
  { name: "Chicken & Quinoa Salad", type: "Lunch", baseCal: 520, basePro: 42, baseCarb: 50, baseFat: 15, time: "01:00 PM" },
  { name: "Turkey Wrap with Avocado", type: "Lunch", baseCal: 480, basePro: 38, baseCarb: 45, baseFat: 18, time: "12:30 PM" },
  { name: "Salmon & Sweet Potato Bowl", type: "Lunch", baseCal: 580, basePro: 40, baseCarb: 55, baseFat: 20, time: "01:30 PM" },
  { name: "Whey Protein Shake", type: "Post-Workout", baseCal: 200, basePro: 30, baseCarb: 15, baseFat: 2, time: "05:30 PM" },
  { name: "Chocolate Milk & Banana", type: "Post-Workout", baseCal: 250, basePro: 18, baseCarb: 38, baseFat: 5, time: "06:00 PM" },
  { name: "Grilled Salmon with Asparagus", type: "Dinner", baseCal: 550, basePro: 45, baseCarb: 25, baseFat: 28, time: "07:30 PM" },
  { name: "Lean Beef Stir-fry with Rice", type: "Dinner", baseCal: 600, basePro: 42, baseCarb: 58, baseFat: 20, time: "08:00 PM" },
  { name: "Tofu & Vegetable Curry", type: "Dinner", baseCal: 480, basePro: 30, baseCarb: 52, baseFat: 20, time: "07:00 PM" },
  { name: "Apple with Almond Butter", type: "Snack", baseCal: 180, basePro: 5, baseCarb: 20, baseFat: 10, time: "10:30 AM" },
  { name: "Hard-boiled Eggs", type: "Snack", baseCal: 140, basePro: 12, baseCarb: 1, baseFat: 10, time: "03:30 PM" },
  { name: "Cottage Cheese with Pineapple", type: "Snack", baseCal: 160, basePro: 20, baseCarb: 18, baseFat: 3, time: "04:00 PM" },
];

const getMealForDay = (dayIndex: number, mealIndex: number, dayRand: () => number) => {
  const template = mealTemplates[(dayIndex * 3 + mealIndex) % mealTemplates.length];
  const variance = 0.85 + dayRand() * 0.3;
  return {
    ...template,
    calories: Math.round(template.baseCal * variance),
    proteinGrams: Math.round(template.basePro * variance),
    carbsGrams: Math.round(template.baseCarb * variance),
    fatGrams: Math.round(template.baseFat * variance),
  };
};

const taskTemplates = [
  { title: 'Review System Architecture Design', notes: 'Review the high-level system design document for the new microservices.', category: 'Work' },
  { title: 'Implement Auth Flow', notes: 'Integrate the new OAuth provider with the frontend.', category: 'Development' },
  { title: 'Code Review: PR #1042', notes: 'Review the payment gateway integration PR.', category: 'Work' },
  { title: 'Read System Design Chapter 5', notes: 'Focus on distributed caching and load balancing.', category: 'Learning' },
  { title: 'Gym Workout: Upper Body', notes: 'Bench press, rows, overhead press.', category: 'Health' },
  { title: 'Write API Integration Tests', notes: 'Cover the new notification service endpoints.', category: 'Development' },
  { title: 'Refactor User Dashboard Components', notes: 'Break down the monolithic dashboard into smaller composable pieces.', category: 'Frontend' },
  { title: 'Study Kafka Streams', notes: 'Watch the Confluent tutorial on stream processing topologies.', category: 'Learning' },
  { title: 'Update Resume & Portfolio', notes: 'Add recent projects and skill endorsements.', category: 'Career' },
  { title: 'Plan Sprint Retrospective', notes: 'Prepare talking points for the team retro.', category: 'Work' },
  { title: 'Database Indexing Optimization', notes: 'Analyze slow queries and add compound indexes.', category: 'Development' },
  { title: 'Design System Component: DataTable', notes: 'Create a reusable paginated DataTable with sort/filter.', category: 'Frontend' },
  { title: 'Read Clean Architecture Chapter 12', notes: 'Focus on boundaries and dependency inversion.', category: 'Learning' },
  { title: 'Docker Compose for Dev Environment', notes: 'Set up PostgreSQL, Redis, and MinIO services.', category: 'DevOps' },
  { title: 'Gym Workout: Lower Body', notes: 'Squats, deadlifts, leg press.', category: 'Health' },
  { title: 'LeetCode: Graph Problems', notes: 'Solve 3 medium graph problems (DFS/BFS variants).', category: 'Learning' },
  { title: 'Review PR: Metrics Pipeline', notes: 'Check the telemetry data pipeline implementation.', category: 'Work' },
  { title: 'Set up CI/CD for Frontend', notes: 'Configure GitHub Actions for automated testing and deployment.', category: 'DevOps' },
  { title: 'Write Technical Blog Draft', notes: 'First draft on "Building Resilient Microservices".', category: 'Career' },
  { title: 'Accessibility Audit', notes: 'Run axe-core audit on the main dashboard and fix violations.', category: 'Frontend' },
  { title: 'Pair Programming Session', notes: 'Help junior dev with GraphQL integration patterns.', category: 'Work' },
  { title: 'Read about WebSocket Best Practices', notes: 'Research reconnection strategies and heartbeat mechanisms.', category: 'Learning' },
  { title: 'Gym Workout: Cardio & Core', notes: '30 min HIIT + core circuit.', category: 'Health' },
  { title: 'Backup and Restore Test', notes: 'Verify the automated backup script works for MongoDB.', category: 'DevOps' },
  { title: 'Organize Notion Knowledge Base', notes: 'Archive stale pages and update the learning roadmap.', category: 'Career' },
];

const generateTasks = (): DailyTask[] => {
  const tasks: DailyTask[] = [];
  const baseDate = new Date();
  let idCounter = 1;

  for (let dayOffset = 6; dayOffset >= -1; dayOffset--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];
    const dayRand = seedRandom(2000 + dayOffset);

    const numTasks = 3 + Math.floor(dayRand() * 2);
    const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    for (let t = 0; t < numTasks && t < taskTemplates.length; t++) {
      const idx = ((dayOffset + 1) * 3 + t) % taskTemplates.length;
      const template = taskTemplates[idx];
      tasks.push({
        id: `dt-${idCounter++}`,
        title: template.title,
        date: dateStr,
        scheduledTime: timeSlots[(dayOffset * 3 + t) % timeSlots.length],
        notes: template.notes,
        completed: dayRand() > 0.35,
        sortOrder: t + 1,
        category: template.category,
      });
    }
  }
  return tasks;
};

export const dummyTasks = generateTasks();

const generateLearningsSummary = (): LearningsSummary => {
  const baseDate = new Date();
  const timeline = [];

  let runningTasksCompleted = 0;
  let runningLearningsCount = 0;

  for (let i = 13; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayRand = seedRandom(3000 + i);

    const learningsCt = 1 + Math.floor(dayRand() * 4);
    const tasksCt = 1 + Math.floor(dayRand() * 3);
    runningLearningsCount += learningsCt;
    runningTasksCompleted += tasksCt;

    timeline.push({
      date: dateStr,
      learningsCount: learningsCt,
      tasksCompleted: tasksCt,
      intensity: 40 + Math.floor(dayRand() * 60),
    });
  }

  // Count today-specific data
  const todayStr = baseDate.toISOString().split('T')[0];
  const todayTimeline = timeline.find(d => d.date === todayStr) || timeline[timeline.length - 1];

  return {
    date: todayStr,
    today: {
      learningsCount: todayTimeline.learningsCount,
      tasksTotal: 8,
      tasksCompleted: todayTimeline.tasksCompleted,
      categories: [
        { name: 'System Design', count: 12 },
        { name: 'React', count: 8 },
        { name: 'Algorithms', count: 15 },
        { name: 'Backend', count: 10 },
        { name: 'DevOps', count: 6 },
        { name: 'Frontend', count: 9 },
      ],
    },
    timeline,
    stats: {
      weeklyLearningCount: timeline.slice(-7).reduce((s, d) => s + d.learningsCount, 0),
      streakDays: 42,
      totalTasksCompleted: runningTasksCompleted,
      totalTasksCount: runningTasksCompleted + 48,
      totalLearningsCount: runningLearningsCount,
      totalPursuitsCount: 3,
    },
  };
};

export const dummyLearningsSummary = generateLearningsSummary();

export const dummyDashboardData = {
  health: {
    nutrition: {
      caloriesConsumed: 1850,
      calorieGoal: 2200,
      proteinGrams: 140,
      proteinGoal: 160,
    },
    hydration: {
      waterIntakeMl: 2500,
      targetMl: 3000,
      progress: 83,
    },
  },
  learnings: {
    todayLogCount: 5,
    todayTasksCount: 8,
    completedTasksCount: 6,
  },
  finance: {
    totalExpense: 1250.50,
    totalIncome: 8000.00,
    budgetRemaining: 2500.00,
  },
};

export const dummyWorkoutsData = {
  recentWorkouts: [
    { id: 'w1', type: 'Running', distance: 5.2, duration: 32, date: todayIso },
    { id: 'w2', type: 'Weightlifting', duration: 45, date: yesterday },
  ],
  weeklyGoalProgress: 75,
};

// Developer Metrics
export const dummyGithubProfile: {
  login: string
  name: string
  avatar_url: string
  bio: string
  public_repos: number
  followers: number
  following: number
  html_url: string
  company: string | null
  blog: string | null
  location: string | null
} = {
  login: 'guest-demo',
  name: 'Guest User',
  avatar_url: '/avatar_luffy.png',
  bio: 'Exploring the dashboard in guest mode.',
  public_repos: 12,
  followers: 0,
  following: 0,
  html_url: '#',
  company: null,
  blog: null,
  location: null,
};

export const dummyGithubRepos = [
  { id: 1, name: 'personal_dashboard', html_url: '#', language: 'TypeScript' },
  { id: 2, name: 'react-ui-components', html_url: '#', language: 'TypeScript' },
  { id: 3, name: 'go-microservices', html_url: '#', language: 'Go' },
];

export const dummyLeetcodeStats = {
  totalSolved: 342,
  easySolved: 120,
  mediumSolved: 180,
  hardSolved: 42,
  totalQuestions: 2800,
  ranking: 45000,
  recentSubmissions: [
    { title: 'Two Sum', titleSlug: 'two-sum', timestamp: '167888', statusDisplay: 'Accepted', lang: 'python' },
    { title: 'LRU Cache', titleSlug: 'lru-cache', timestamp: '167889', statusDisplay: 'Accepted', lang: 'java' },
    { title: 'Merge K Sorted Lists', titleSlug: 'merge-k-sorted-lists', timestamp: '167890', statusDisplay: 'Accepted', lang: 'typescript' },
  ],
  submissionCalendar: {
    [Math.floor(Date.now() / 1000) - 86400]: 4,
    [Math.floor(Date.now() / 1000) - 86400 * 2]: 2,
    [Math.floor(Date.now() / 1000) - 86400 * 3]: 5,
    [Math.floor(Date.now() / 1000) - 86400 * 4]: 1,
  },
};

export const dummyLeetcodeProfile: {
  username: string
  name: string
  avatar: string
  ranking: number
  about: string
  country: string | null
  school: string | null
} = {
  username: 'guest-demo',
  name: 'Guest User',
  avatar: '/avatar_luffy.png',
  ranking: 45000,
  about: 'Exploring DSA problems in guest mode.',
  country: null,
  school: null,
};

export interface DeepMealLog {
  id: string;
  mealName: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Pre-Workout' | 'Post-Workout';
  timestamp: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface Micronutrients {
  fiberGrams: number;
  sugarGrams: number;
  sodiumMg: number;
  ironMg: number;
  vitaminCMg: number;
  calciumMg: number;
}

export interface HydrationLog {
  time: string;
  amountOunces: number;
}

export interface FastingWindow {
  start: string;
  end: string;
  durationHours: number;
}

export interface NutritionHistoryDay {
  date: string;
  dailyMetrics: {
    caloriesConsumed: number;
    calorieGoal: number;
    dailyScore: number;
    macroBreakdown: {
      protein: { logged: number; target: number };
      carbs: { logged: number; target: number };
      fat: { logged: number; target: number };
    };
  };
  additionalInfo: {
    mealLogs: DeepMealLog[];
    micronutrients: Micronutrients;
    hydrationLogs: HydrationLog[];
    fastingWindow: FastingWindow;
    dietaryFiberPercentage: number;
    glycemicLoad: number;
    aiInsight: string;
  };
}

const generateNutritionHistory = (): NutritionHistoryDay[] => {
  const history: NutritionHistoryDay[] = [];
  const baseDate = new Date();
  
  const insights = [
    "Excellent protein intake today, but sodium was 15% above target. Good hydration during your workout window.",
    "A bit light on calories. You might feel fatigued during tomorrow's workout.",
    "Great macro balance! Your fiber intake was particularly strong, supporting digestion.",
    "Higher carb intake today aligns well with your intense training session.",
    "Slightly over your fat target, but calorie goal was maintained. Keep an eye on saturated fats.",
    "Perfect fasting window and excellent hydration. A very healthy day overall.",
    "Weekend fluctuation observed. Calories were 10% higher but perfectly acceptable for a refeed day.",
    "Low water intake. Aim for at least 3 liters tomorrow to improve recovery.",
    "Solid adherence to targets. Try adding more leafy greens for higher Iron and Calcium.",
    "Optimal day! Macros were within 5% of targets and glycemic load was kept perfectly low."
  ];

  for (let i = 0; i < 10; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - (9 - i));
    const dateStr = d.toISOString().split('T')[0];
    
    const dayRand = seedRandom(i + 1000);
    
    const numMeals = 3 + Math.floor(dayRand() * 2);
    const mealLogs: DeepMealLog[] = [];
    let mealIdCounter = 0;
    
    for (let m = 0; m < numMeals; m++) {
      const meal = getMealForDay(i, m, dayRand);
      mealLogs.push({
        id: `meal-${i}-${m}`,
        mealName: meal.name,
        type: meal.type as DeepMealLog['type'],
        timestamp: meal.time,
        calories: meal.calories,
        proteinGrams: meal.proteinGrams,
        carbsGrams: meal.carbsGrams,
        fatGrams: meal.fatGrams,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      mealIdCounter++;
    }
    
    const totalMealCals = mealLogs.reduce((s, m) => s + m.calories, 0);
    const totalMealPro = mealLogs.reduce((s, m) => s + m.proteinGrams, 0);
    const totalMealCarbs = mealLogs.reduce((s, m) => s + m.carbsGrams, 0);
    const totalMealFat = mealLogs.reduce((s, m) => s + m.fatGrams, 0);
    
    const hydrationAmounts = [12, 16, 20, 24, 28, 32];
    const numHydrationLogs = 3 + Math.floor(dayRand() * 3);
    const hydrationLogs: HydrationLog[] = [];
    for (let h = 0; h < numHydrationLogs; h++) {
      const hour = 8 + h * 3 + Math.floor(dayRand() * 2);
      hydrationLogs.push({
        time: `${hour.toString().padStart(2, '0')}:00 AM`,
        amountOunces: hydrationAmounts[Math.floor(dayRand() * hydrationAmounts.length)],
      });
    }
    
    const fastingStartHour = 20 + Math.floor(dayRand() * 2);
    const fastingEndHour = 7 + Math.floor(dayRand() * 2);
    const fastingDuration = (24 - fastingStartHour) + fastingEndHour + 0.5;
    
    history.push({
      date: dateStr,
      dailyMetrics: {
        caloriesConsumed: totalMealCals,
        calorieGoal: 2200,
        dailyScore: Math.floor(dayRand() * 15) + 85,
        macroBreakdown: {
          protein: { logged: totalMealPro, target: 160 },
          carbs: { logged: totalMealCarbs, target: 200 },
          fat: { logged: totalMealFat, target: 70 },
        }
      },
      additionalInfo: {
        mealLogs,
        micronutrients: {
          fiberGrams: Math.round(25 + dayRand() * 10),
          sugarGrams: Math.round(30 + dayRand() * 20),
          sodiumMg: Math.round(2000 + dayRand() * 800),
          ironMg: Math.round(12 + dayRand() * 6),
          vitaminCMg: Math.round(80 + dayRand() * 40),
          calciumMg: Math.round(800 + dayRand() * 300),
        },
        hydrationLogs,
        fastingWindow: {
          start: `${fastingStartHour.toString().padStart(2, '0')}:00 PM`,
          end: `${fastingEndHour.toString().padStart(2, '0')}:30 AM`,
          durationHours: Math.round(fastingDuration * 10) / 10,
        },
        dietaryFiberPercentage: Math.round(100 + dayRand() * 20),
        glycemicLoad: Math.round(45 + dayRand() * 20),
        aiInsight: insights[i]
      }
    });
  }
  return history;
};

export const dummyNutritionHistory = generateNutritionHistory();

// ─── Learning Logs ───────────────────────────────────────────────────

const learningLogTemplates = [
  { title: 'Chapter 5: Replication in Distributed Systems', description: 'Studied leader-based replication, multi-leader replication, and quorum-based consistency models from DDIA.', category: 'System Design' },
  { title: 'React Server Components Deep Dive', description: 'Explored RSC architecture, server-side rendering patterns, and how streaming SSR improves perceived performance.', category: 'React' },
  { title: 'JWT Authentication Flow Implementation', description: 'Implemented access + refresh token rotation pattern with HTTP-only cookies for improved security posture.', category: 'Backend' },
  { title: 'LeetCode: Graph Traversal Practice', description: 'Solved 3 medium problems: Number of Islands, Course Schedule II, and Alien Dictionary (Topological Sort).', category: 'Algorithms' },
  { title: 'Docker Multi-stage Builds Optimization', description: 'Reduced final image size by 62% using multi-stage builds and Alpine base images for the Go service.', category: 'DevOps' },
  { title: 'Microservices Communication Patterns', description: 'Compared synchronous (gRPC, REST) vs asynchronous (event bus, message queues) communication strategies.', category: 'Architecture' },
  { title: 'MongoDB Aggregation Pipeline Mastery', description: 'Learned about $lookup, $unwind, $group stages and how to optimize aggregation queries with indexes.', category: 'Database' },
  { title: 'CSS Grid Layout Advanced Patterns', description: 'Mastered nested grids, subgrid, and auto-fill/auto-fit for complex responsive layouts without media queries.', category: 'Frontend' },
  { title: 'State Management with Zustand', description: 'Compared Zustand vs Redux vs Context API. Built a simple shopping cart to evaluate developer experience.', category: 'React' },
  { title: 'DDIA Chapter 6: Partitioning', description: 'Studied hash-based partitioning, range partitioning, and rebalancing strategies in distributed databases.', category: 'System Design' },
  { title: 'Golang Concurrency Patterns', description: 'Explored fan-in, fan-out, worker pools, and select statement patterns for concurrent request handling.', category: 'Backend' },
  { title: 'Dynamic Programming Bootcamp', description: 'Worked through 0/1 Knapsack, Longest Common Subsequence, and Edit Distance problems.', category: 'Algorithms' },
  { title: 'Setting up Prometheus & Grafana', description: 'Deployed monitoring stack with custom metrics, alerting rules, and a dashboard for API latency tracking.', category: 'DevOps' },
  { title: 'Event-Driven Architecture Design', description: 'Designed an event schema registry and idempotent consumers for the order processing pipeline.', category: 'Architecture' },
  { title: 'PostgreSQL Query Performance Tuning', description: 'Used EXPLAIN ANALYZE to identify sequential scans and added partial indexes for 10x faster queries.', category: 'Database' },
  { title: 'Web Accessibility: ARIA Live Regions', description: 'Implemented screen reader announcements for dynamic content updates using aria-live and role=status.', category: 'Frontend' },
  { title: 'React Query (TanStack Query) Deep Dive', description: 'Learned about stale-while-revalidate caching, optimistic updates, and infinite queries for paginated lists.', category: 'React' },
  { title: 'CAP Theorem & PACELC Trade-offs', description: 'Analyzed real-world databases (Cassandra, MongoDB, CockroachDB) through the lens of consistency vs availability.', category: 'System Design' },
  { title: 'Rate Limiting Implementation', description: 'Built a sliding window rate limiter using Redis sorted sets with configurable thresholds per API key.', category: 'Backend' },
  { title: 'LeetCode: Tree & BST Problems', description: 'Solved Validate BST, Lowest Common Ancestor, and Serialize/Deserialize Binary Tree.', category: 'Algorithms' },
  { title: 'Helm Charts for Kubernetes Deployments', description: 'Created reusable Helm charts templating for microservices with environment-specific overrides.', category: 'DevOps' },
  { title: 'CQRS & Event Sourcing Patterns', description: 'Studied command-query separation with separate read/write models and event store implementation strategies.', category: 'Architecture' },
  { title: 'Redis Caching Strategies', description: 'Implemented cache-aside, write-through, and write-behind patterns for the product catalog service.', category: 'Database' },
  { title: 'Tailwind CSS Custom Design System', description: 'Extended the default theme with custom colors, typography scale, and reusable component classes.', category: 'Frontend' },
  { title: 'Custom React Hooks for Data Fetching', description: 'Created usePaginatedQuery, useDebouncedSearch, and useWebSocket hooks for common data patterns.', category: 'React' },
  { title: 'Consistent Hashing & Distributed Caching', description: 'Implemented a consistent hashing ring to distribute cache keys across a cluster of Redis nodes.', category: 'System Design' },
  { title: 'GraphQL Subscriptions with WebSockets', description: 'Set up real-time data push for live notifications using Apollo GraphQL subscriptions over WebSocket.', category: 'Backend' },
  { title: 'LeetCode: Sliding Window Technique', description: 'Mastered the sliding window pattern with 4 problems: Minimum Window Substring, Longest Substring Without Repeating Chars.', category: 'Algorithms' },
  { title: 'GitHub Actions Workflow Optimization', description: 'Parallelized CI jobs, added caching for node_modules, and reduced build time from 12 to 4 minutes.', category: 'DevOps' },
  { title: 'Hexagonal Architecture in Practice', description: 'Refactored the notification service to use ports and adapters pattern for better testability.', category: 'Architecture' },
  { title: 'SQL Window Functions Deep Dive', description: 'Learned ROW_NUMBER, RANK, LAG/LEAD, and running totals with real business reporting queries.', category: 'Database' },
  { title: 'Responsive Typography System', description: 'Built a fluid type scale using clamp() that scales smoothly across all viewport sizes.', category: 'Frontend' },
  { title: 'React Performance Optimization', description: 'Applied React.memo, useMemo, useCallback, and virtualization (react-window) to improve render performance.', category: 'React' },
  { title: 'Load Balancing Algorithms Compared', description: 'Studied round-robin, least connections, IP hash, and consistent hashing load balancer behaviors.', category: 'System Design' },
  { title: 'API Versioning Strategies', description: 'Evaluated URI versioning, header versioning, and content negotiation for the public REST API.', category: 'Backend' },
];

const generateLearningLogs = (): LearningLog[] => {
  const logs: LearningLog[] = [];
  const baseDate = new Date();
  let idCounter = 1;

  for (let i = 0; i < learningLogTemplates.length; i++) {
    const dayOffset = i % 14;
    const d = new Date(baseDate);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];
    const dayRand = seedRandom(4000 + i);

    const hours = 8 + Math.floor(dayRand() * 11);
    const minutes = Math.floor(dayRand() * 60);
    const createdAtStr = `${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`;

    const template = learningLogTemplates[i];
    logs.push({
      id: `ll-${idCounter++}`,
      title: template.title,
      description: template.description,
      category: template.category,
      date: dateStr,
      notionUrl: dayRand() > 0.6 ? `https://notion.so/learning-${template.category.toLowerCase().replace(/\s+/g, '-')}-${i}` : undefined,
      createdAt: createdAtStr,
    });
  }
  return logs;
};

export const dummyLearningLogs = generateLearningLogs();

// ─── Learning Pursuits ───────────────────────────────────────────────

const generatePursuits = (): LearningPursuit[] => {
  return [
    {
      id: 'p-1',
      title: 'Master System Design for Interviews',
      category: 'System Design',
      notionUrl: 'https://notion.so/master-system-design',
      status: 'ACTIVE',
      steps: [
        { id: 'ps-1-1', text: 'Complete Chapters 1-4 of DDIA', isCompleted: true },
        { id: 'ps-1-2', text: 'Design a URL Shortener (preparation)', isCompleted: true },
        { id: 'ps-1-3', text: 'Design WhatsApp/Chat System', isCompleted: false },
        { id: 'ps-1-4', text: 'Design a Distributed Key-Value Store', isCompleted: false },
        { id: 'ps-1-5', text: 'Practice mock interviews with peers', isCompleted: false },
      ],
    },
    {
      id: 'p-2',
      title: 'Full Stack SaaS Boilerplate',
      category: 'Development',
      notionUrl: 'https://notion.so/saas-boilerplate',
      status: 'ACTIVE',
      steps: [
        { id: 'ps-2-1', text: 'Set up Next.js + Tailwind project', isCompleted: true },
        { id: 'ps-2-2', text: 'Implement authentication with NextAuth', isCompleted: true },
        { id: 'ps-2-3', text: 'Build subscription billing (Stripe)', isCompleted: false },
        { id: 'ps-2-4', text: 'Add team/organization management', isCompleted: false },
        { id: 'ps-2-5', text: 'Deploy to production with CI/CD', isCompleted: false },
      ],
    },
    {
      id: 'p-3',
      title: 'Kubernetes Certification Prep (CKA)',
      category: 'DevOps',
      notionUrl: 'https://notion.so/cka-prep',
      status: 'ACTIVE',
      steps: [
        { id: 'ps-3-1', text: 'Set up local K8s cluster (kind/minikube)', isCompleted: true },
        { id: 'ps-3-2', text: 'Learn Pods, Deployments, Services', isCompleted: true },
        { id: 'ps-3-3', text: 'ConfigMaps, Secrets, and Ingress', isCompleted: false },
        { id: 'ps-3-4', text: 'Helm charts & package management', isCompleted: false },
        { id: 'ps-3-5', text: 'Take practice exams', isCompleted: false },
      ],
    },
  ];
};

export const dummyPursuits = generatePursuits();

const calendarItemTemplates = [
  { title: 'Team Standup', category: 'Work', color: '#3B82F6', itemType: 'EVENT' as const, startTime: '09:00', endTime: '09:30', notes: 'Daily sync with the engineering team discussing progress and blockers.' },
  { title: 'Code Review Session', category: 'Work', color: '#6366F1', itemType: 'TASK' as const, startTime: '10:00', endTime: '11:00', notes: 'Review pending PRs from the team.' },
  { title: 'Gym - Upper Body', category: 'Health', color: '#10B981', itemType: 'EVENT' as const, startTime: '07:00', endTime: '08:30', notes: 'Bench press, rows, overhead press, and lateral raises.' },
  { title: 'Read System Design', category: 'Learning', color: '#F59E0B', itemType: 'TASK' as const, startTime: '20:00', endTime: '21:00', notes: 'Chapter 7: Strong vs Eventual Consistency models.' },
  { title: 'Morning Vitamins', category: 'Health', color: '#84CC16', itemType: 'REMINDER' as const, startTime: '08:00', notes: 'Daily multivitamin, Omega-3, and Vitamin D.' },
  { title: 'Meditation Session', category: 'Health', color: '#A855F7', itemType: 'REMINDER' as const, startTime: '07:30', notes: '10-minute mindfulness meditation.' },
  { title: 'Alpha Release Milestone', category: 'Work', color: '#EF4444', itemType: 'MILESTONE' as const, notes: 'Internal alpha release of the new dashboard feature.' },
  { title: 'LeetCode Practice', category: 'Learning', color: '#06B6D4', itemType: 'TASK' as const, startTime: '19:00', endTime: '20:00', notes: 'Solve 2 medium difficulty problems with optimal solutions.' },
  { title: 'Weekly Planning', category: 'Work', color: '#8B5CF6', itemType: 'EVENT' as const, startTime: '09:00', endTime: '09:45', notes: 'Plan tasks and priorities for the week ahead.' },
  { title: 'Deep Work Session', category: 'Learning', color: '#EC4899', itemType: 'TASK' as const, startTime: '21:00', endTime: '21:30', notes: 'Read Deep Work by Cal Newport, pages 50-70.' },
  { title: 'Evening Walk', category: 'Health', color: '#14B8A6', itemType: 'REMINDER' as const, startTime: '18:00', notes: 'Evening walk around the neighborhood for fresh air.' },
  { title: 'Call with Parents', category: 'Personal', color: '#F97316', itemType: 'EVENT' as const, startTime: '19:00', endTime: '19:30', notes: 'Weekly catch-up call with family.' },
  { title: 'Grocery Run', category: 'Personal', color: '#22C55E', itemType: 'TASK' as const, startTime: '17:00', endTime: '18:00', notes: 'Weekly groceries at Trader Joe\'s.' },
  { title: 'Dentist Checkup', category: 'Health', color: '#EAB308', itemType: 'EVENT' as const, startTime: '14:00', endTime: '15:00', notes: 'Regular dental checkup at Dr. Smith\'s office.' },
  { title: 'Evening Journal', category: 'Personal', color: '#D946EF', itemType: 'REMINDER' as const, startTime: '22:00', notes: 'Write about the day, reflect on accomplishments.' },
  { title: 'Sprint Planning', category: 'Work', color: '#2563EB', itemType: 'EVENT' as const, startTime: '10:00', endTime: '11:30', notes: 'Bi-weekly sprint planning session with the team.' },
  { title: 'Budget Review', category: 'Personal', color: '#059669', itemType: 'TASK' as const, startTime: '20:00', endTime: '20:30', notes: 'Monthly budget review and expense tracking.' },
  { title: 'Morning Yoga', category: 'Health', color: '#7C3AED', itemType: 'EVENT' as const, startTime: '06:30', endTime: '07:15', notes: 'Morning yoga flow session for flexibility.' },
  { title: 'Blog Post Draft', category: 'Learning', color: '#DB2777', itemType: 'TASK' as const, startTime: '15:00', endTime: '16:00', notes: 'Draft technical blog post on microservices observability.' },
  { title: 'Pay Utilities', category: 'Personal', color: '#DC2626', itemType: 'TASK' as const, startTime: '12:00', endTime: '12:15', notes: 'Pay electricity and internet bills for the month.' },
  { title: 'Plan Weekly Meals', category: 'Personal', color: '#E11D48', itemType: 'TASK' as const, startTime: '10:00', endTime: '10:30', notes: 'Plan breakfast, lunch, and dinner for the week ahead.' },
  { title: 'Update Resume', category: 'Career', color: '#0EA5E9', itemType: 'TASK' as const, startTime: '14:00', endTime: '15:00', notes: 'Add recent projects and update the skills section.' },
  { title: 'Team Retrospective', category: 'Work', color: '#8B5CF6', itemType: 'EVENT' as const, startTime: '15:00', endTime: '16:00', notes: 'Sprint retrospective with the engineering team.' },
  { title: 'Stretch Break', category: 'Health', color: '#34D399', itemType: 'REMINDER' as const, startTime: '11:00', notes: '5-minute desk stretches to avoid stiffness.' },
  { title: 'Read Technical Article', category: 'Learning', color: '#F472B6', itemType: 'TASK' as const, startTime: '12:30', endTime: '13:00', notes: 'Read about WebAssembly and its real-world use cases.' },
  { title: 'Client Meeting', category: 'Work', color: '#6366F1', itemType: 'EVENT' as const, startTime: '11:00', endTime: '12:00', notes: 'Quarterly review meeting with the client stakeholders.' },
  { title: 'Water Indoor Plants', category: 'Personal', color: '#A3E635', itemType: 'REMINDER' as const, startTime: '09:00', notes: 'Water all the indoor plants and check soil moisture.' },
  { title: 'Review Analytics', category: 'Work', color: '#F59E0B', itemType: 'TASK' as const, startTime: '16:00', endTime: '16:30', notes: 'Check weekly metrics and user engagement dashboard.' },
  { title: 'TypeScript Patterns Study', category: 'Learning', color: '#38BDF8', itemType: 'TASK' as const, startTime: '20:30', endTime: '21:30', notes: 'Study advanced generics and utility type patterns.' },
  { title: 'Cook New Recipe', category: 'Personal', color: '#FB923C', itemType: 'EVENT' as const, startTime: '18:30', endTime: '19:30', notes: 'Try the new pasta recipe from the cookbook.' },
];

const generateCalendarItems = (): CalendarItem[] => {
  const items: CalendarItem[] = [];
  const baseDate = new Date();
  let idCounter = 1;

  for (let dayOffset = 9; dayOffset >= 0; dayOffset--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];
    const dayRand = seedRandom(5000 + dayOffset);

    const numItems = 5 + Math.floor(dayRand() * 5);

    for (let t = 0; t < numItems; t++) {
      const templateIdx = (dayOffset * 3 + t * 7) % calendarItemTemplates.length;
      const template = calendarItemTemplates[templateIdx];

      const isRecurring = (dayOffset === 0 || dayOffset === 5) && t === 0;
      const recurrenceFreq: CalendarRecurrence | undefined = isRecurring
        ? dayOffset === 0 ? 'DAILY' : 'WEEKLY'
        : undefined;

      items.push({
        id: `ci-${idCounter++}`,
        date: dateStr,
        title: template.title,
        startTime: template.startTime,
        endTime: template.endTime,
        allDay: template.itemType === 'MILESTONE' || undefined,
        itemType: template.itemType,
        category: template.category,
        color: template.color,
        notes: template.notes,
        completed: dayRand() > 0.5,
        sortOrder: t + 1,
        recurrenceFrequency: recurrenceFreq,
        recurrenceUntil: isRecurring
          ? new Date(baseDate.getTime() + 60 * 86400000).toISOString().split('T')[0]
          : undefined,
        createdAt: `${dateStr}T${String(6 + t).padStart(2, '0')}:00:00.000Z`,
      });
    }
  }
  return items;
};

export const dummyCalendarItems = generateCalendarItems();

const financeTxTemplates = [
  { description: 'Zomato Order - Dinner', category: 'Food', type: 'expense', amount: 450 },
  { description: 'Swiggy - Lunch', category: 'Food', type: 'expense', amount: 320 },
  { description: 'Uber Ride to Office', category: 'Transport', type: 'expense', amount: 180 },
  { description: 'Amazon Electronics Purchase', category: 'Shopping', type: 'expense', amount: 2499 },
  { description: 'Electricity Bill Payment', category: 'Bills', type: 'expense', amount: 1850 },
  { description: 'Internet Bill - Airtel', category: 'Bills', type: 'expense', amount: 999 },
  { description: 'Netflix Monthly Subscription', category: 'Entertainment', type: 'expense', amount: 199 },
  { description: 'Gym Membership Fee', category: 'Health', type: 'expense', amount: 1500 },
  { description: 'Monthly Rent Payment', category: 'Home', type: 'expense', amount: 15000 },
  { description: 'Salary Credit - August', category: 'Salary', type: 'income', amount: 85000 },
  { description: 'Dinner at Italian Restaurant', category: 'Dining', type: 'expense', amount: 1200 },
  { description: 'Metro Card Recharge', category: 'Transport', type: 'expense', amount: 500 },
  { description: 'Blinkit Grocery Order', category: 'Groceries', type: 'expense', amount: 780 },
  { description: 'Phone Recharge - Jio', category: 'Bills', type: 'expense', amount: 349 },
  { description: 'Weekend Movie Tickets', category: 'Entertainment', type: 'expense', amount: 600 },
  { description: 'Pharmacy - Medicines', category: 'Health', type: 'expense', amount: 450 },
  { description: 'Freelance Project Payment', category: 'Income', type: 'income', amount: 25000 },
  { description: 'DMart Weekly Groceries', category: 'Groceries', type: 'expense', amount: 1250 },
  { description: 'Ola Auto Ride', category: 'Transport', type: 'expense', amount: 85 },
  { description: 'Spotify Premium', category: 'Entertainment', type: 'expense', amount: 119 },
  { description: 'Domino\'s Pizza Order', category: 'Food', type: 'expense', amount: 599 },
  { description: 'New Running Shoes', category: 'Shopping', type: 'expense', amount: 5499 },
  { description: 'Water Bill Payment', category: 'Bills', type: 'expense', amount: 650 },
  { description: 'Breakfast at Cafe', category: 'Dining', type: 'expense', amount: 350 },
  { description: 'Dividend Credit - Stocks', category: 'Income', type: 'income', amount: 3200 },
  { description: 'Zepto Quick Delivery', category: 'Groceries', type: 'expense', amount: 420 },
  { description: 'Yoga Class Fee', category: 'Health', type: 'expense', amount: 2000 },
  { description: 'Rapido Bike Taxi', category: 'Transport', type: 'expense', amount: 45 },
  { description: 'Myntra Clothing Order', category: 'Shopping', type: 'expense', amount: 3299 },
  { description: 'Petrol Refill', category: 'Transport', type: 'expense', amount: 1200 },
  { description: 'Book Purchase - Amazon', category: 'Shopping', type: 'expense', amount: 799 },
  { description: 'Haircut at Salon', category: 'Personal', type: 'expense', amount: 500 },
  { description: 'Insurance Premium Payment', category: 'Bills', type: 'expense', amount: 4500 },
  { description: 'Birthday Gift for Friend', category: 'Shopping', type: 'expense', amount: 1500 },
  { description: 'Credit Card Bill Payment', category: 'Bills', type: 'expense', amount: 12000 },
  { description: 'Stock Trading Profit', category: 'Income', type: 'income', amount: 8500 },
  { description: 'Saturday Brunch', category: 'Dining', type: 'expense', amount: 850 },
  { description: 'Protein Powder Purchase', category: 'Health', type: 'expense', amount: 2200 },
  { description: 'Car Wash Service', category: 'Transport', type: 'expense', amount: 300 },
  { description: 'Rent Security Deposit Refund', category: 'Income', type: 'income', amount: 15000 },
];

const lendingRecordTemplates = [
  { borrower: 'Rahul Sharma', amount: 5000, status: 'Pending' as const, notes: 'Bike repair loan', dueDateOffset: 15 },
  { borrower: 'Priya Patel', amount: 2000, status: 'Pending' as const, notes: 'Lunch money borrowed', dueDateOffset: 7 },
  { borrower: 'Amit Singh', amount: 15000, status: 'Pending' as const, notes: 'Emergency medical expense', dueDateOffset: 30 },
  { borrower: 'Neha Gupta', amount: 3000, status: 'Repaid' as const, notes: 'Concert tickets', dueDateOffset: -10 },
  { borrower: 'Vikram Joshi', amount: 8000, status: 'Pending' as const, notes: 'Laptop repair cost', dueDateOffset: 20 },
  { borrower: 'Sneha Reddy', amount: 1000, status: 'Repaid' as const, notes: 'Tea and snacks', dueDateOffset: -5 },
  { borrower: 'Arun Kumar', amount: 25000, status: 'Pending' as const, notes: 'Down payment for bike', dueDateOffset: 45 },
];

const sliceRepaymentTemplates = [
  { dueDateOffset: 0, amount: '₹2,500', status: 'pending' },
  { dueDateOffset: 30, amount: '₹2,500', status: 'pending' },
  { dueDateOffset: 60, amount: '₹2,500', status: 'pending' },
  { dueDateOffset: 90, amount: '₹2,500', status: 'pending' },
  { dueDateOffset: -30, amount: '₹2,500', status: 'paid' },
  { dueDateOffset: -60, amount: '₹2,500', status: 'paid' },
  { dueDateOffset: -90, amount: '₹2,500', status: 'paid' },
  { dueDateOffset: -120, amount: '₹2,500', status: 'paid' },
];

const generateFinanceLogs = (): DailyFinancialLog[] => {
  const logs: DailyFinancialLog[] = [];
  const baseDate = new Date();
  let logIdCounter = 1;
  let txIdCounter = 1;

  for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];
    const dayRand = seedRandom(6000 + dayOffset);

    const numTx = 2 + Math.floor(dayRand() * 5);
    const transactions: Record<string, FinancialTransaction[]> = {};
    let totalExpense = 0;
    let totalIncome = 0;

    const usedIndices = new Set<number>();

    for (let t = 0; t < numTx; t++) {
      let idx = (dayOffset * 5 + t * 13) % financeTxTemplates.length;
      while (usedIndices.has(idx)) {
        idx = (idx + 1) % financeTxTemplates.length;
      }
      usedIndices.add(idx);

      const template = financeTxTemplates[idx];
      const amount = Math.round(template.amount * (0.85 + dayRand() * 0.3));
      const hour = 6 + Math.floor(dayRand() * 16);
      const minute = Math.floor(dayRand() * 60);
      const timestamp = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;

      const tx: FinancialTransaction = {
        id: `ftx-${txIdCounter++}`,
        description: template.description,
        amount,
        timestamp,
      };

      if (!transactions[template.category]) {
        transactions[template.category] = [];
      }
      transactions[template.category].push(tx);

      if (template.type === 'expense') {
        totalExpense += amount;
      } else {
        totalIncome += amount;
      }
    }

    const dailyTotals: FinancialTotals = { totalExpense, totalIncome };

    logs.push({
      id: `fl-${logIdCounter++}`,
      date: dateStr,
      dailyTotals,
      transactions,
    });
  }
  return logs;
};

const generateLendingRecords = (): LendingRecord[] => {
  const baseDate = new Date();

  return lendingRecordTemplates.map((template, i) => {
    const lentDate = new Date(baseDate);
    lentDate.setDate(lentDate.getDate() - 10 + i * 3);
    const dateStr = lentDate.toISOString().split('T')[0];

    let dueDateStr: string | undefined;
    if (template.dueDateOffset) {
      const dueDate = new Date(lentDate);
      dueDate.setDate(dueDate.getDate() + template.dueDateOffset);
      dueDateStr = dueDate.toISOString().split('T')[0];
    }

    return {
      id: `lr-${i + 1}`,
      borrower: template.borrower,
      amount: template.amount,
      date: dateStr,
      dueDate: dueDateStr,
      status: template.status,
      notes: template.notes,
    };
  });
};

const generateSliceRepayments = (): RepaymentInstallment[] => {
  const baseDate = new Date();

  return sliceRepaymentTemplates.map((template, i) => {
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + template.dueDateOffset);
    const dateStr = dueDate.toISOString().split('T')[0];

    return {
      id: `sr-${i + 1}`,
      dueDate: dateStr,
      amount: template.amount,
      status: template.status,
    };
  });
};

export const dummyFinanceLogs = generateFinanceLogs();
export const dummyLendingRecords = generateLendingRecords();
export const dummySliceRepayments = generateSliceRepayments();

const workoutActivityTemplates = [
  { name: 'Morning Run - Riverside', sportType: 'Run', distance: 5.2, time: '28:15', timeMin: 28, elev: 32, pace: 5.26 },
  { name: 'Evening Easy Run', sportType: 'Run', distance: 3.8, time: '22:40', timeMin: 23, elev: 18, pace: 5.58 },
  { name: 'Weekend Long Run', sportType: 'Run', distance: 12.4, time: '68:30', timeMin: 69, elev: 85, pace: 5.31 },
  { name: 'Tempo Run', sportType: 'Run', distance: 7.0, time: '35:20', timeMin: 35, elev: 42, pace: 5.03 },
  { name: 'Interval Training', sportType: 'Run', distance: 6.5, time: '34:00', timeMin: 34, elev: 28, pace: 5.14 },
  { name: 'Recovery Jog', sportType: 'Run', distance: 4.2, time: '26:30', timeMin: 27, elev: 15, pace: 6.18 },
  { name: '5K Time Trial', sportType: 'Run', distance: 5.0, time: '24:10', timeMin: 24, elev: 22, pace: 4.50 },
  { name: 'Trail Run - Forest Park', sportType: 'Run', distance: 8.8, time: '52:00', timeMin: 52, elev: 120, pace: 5.55 },
  { name: 'Commute Ride', sportType: 'Ride', distance: 18.5, time: '52:00', timeMin: 52, elev: 95, pace: undefined },
  { name: 'Weekend Group Ride', sportType: 'Ride', distance: 45.2, time: '125:00', timeMin: 125, elev: 340, pace: undefined },
  { name: 'Afternoon Bike Ride', sportType: 'Ride', distance: 25.8, time: '72:00', timeMin: 72, elev: 180, pace: undefined },
  { name: 'Easy Recovery Ride', sportType: 'Ride', distance: 12.0, time: '38:00', timeMin: 38, elev: 55, pace: undefined },
  { name: 'Evening Walk', sportType: 'Walk', distance: 2.5, time: '35:00', timeMin: 35, elev: 8, pace: 14.0 },
  { name: 'Morning Walk with Dog', sportType: 'Walk', distance: 1.8, time: '25:00', timeMin: 25, elev: 5, pace: 13.51 },
  { name: 'Lunch Break Walk', sportType: 'Walk', distance: 3.2, time: '42:00', timeMin: 42, elev: 12, pace: 13.08 },
  { name: 'E-Bike Grocery Run', sportType: 'E-Bike Ride', distance: 6.8, time: '18:00', timeMin: 18, elev: 22, pace: undefined },
  { name: 'E-Bike Commute', sportType: 'E-Bike Ride', distance: 14.2, time: '35:00', timeMin: 35, elev: 68, pace: undefined },
  { name: 'HIIT Workout', sportType: 'Other', distance: 0, time: '30:00', timeMin: 30, elev: 0, pace: undefined },
  { name: 'Strength Training', sportType: 'Other', distance: 0, time: '45:00', timeMin: 45, elev: 0, pace: undefined },
  { name: 'Yoga Session', sportType: 'Other', distance: 0, time: '40:00', timeMin: 40, elev: 0, pace: undefined },
];

const generateDummyActivities = (): StravaActivity[] => {
  const activities: StravaActivity[] = [];
  const baseDate = new Date();
  let idCounter = 1;

  for (let i = 0; i < workoutActivityTemplates.length; i++) {
    const dayOffset = Math.floor(i * 1.4);
    const d = new Date(baseDate);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];

    const template = workoutActivityTemplates[i];

    activities.push({
      id: `wa-${idCounter++}`,
      date: dateStr,
      activityName: template.name,
      sportType: template.sportType,
      distanceKm: template.distance,
      movingTime: template.time,
      movingTimeMinutes: template.timeMin,
      elevationGainMeters: template.elev,
      paceMinPerKm: template.pace,
      source: 'strava',
    });
  }
  return activities;
};

const generateDummyStats = (activities: StravaActivity[]): StravaActivityStats => {
  let totalDistanceKm = 0;
  let totalMovingTimeMinutes = 0;
  let totalElevationMeters = 0;
  const countBySportType: Record<string, number> = {};
  const distanceBySportType: Record<string, number> = {};

  for (const a of activities) {
    totalDistanceKm += a.distanceKm;
    totalMovingTimeMinutes += a.movingTimeMinutes;
    totalElevationMeters += a.elevationGainMeters;
    countBySportType[a.sportType] = (countBySportType[a.sportType] || 0) + 1;
    distanceBySportType[a.sportType] = (distanceBySportType[a.sportType] || 0) + a.distanceKm;
  }

  const runActivities = activities.filter(a => a.sportType === 'Run');
  const best5k = runActivities.length > 0
    ? Math.min(...runActivities.filter(a => a.paceMinPerKm != null).map(a => a.paceMinPerKm!))
    : null;

  return {
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalActivities: activities.length,
    totalMovingTimeMinutes,
    totalElevationMeters: Math.round(totalElevationMeters),
    best5kPaceMinPerKm: best5k,
    best5kPaceFormatted: best5k ? `${Math.floor(best5k)}:${String(Math.round((best5k % 1) * 60)).padStart(2, '0')} min/km` : '—',
    countBySportType,
    distanceBySportType,
    currentStreakWeeks: 4,
    recentEmbeds: [{ id: '18760429131', token: 'mJPz6Bth1sW7HIfIaScppJ6ntZVYan_ASUFl2sV_px4' }],
  };
};

const dummyActivities = generateDummyActivities();
export const dummyStravaActivities = dummyActivities;
export const dummyStravaStats = generateDummyStats(dummyActivities);
