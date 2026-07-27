import {
  dummyTasks,
  dummyLearningsSummary,
  dummyDashboardData,
  dummyWorkoutsData,
  dummyGithubProfile,
  dummyGithubRepos,
  dummyLeetcodeStats,
  dummyLeetcodeProfile,
  dummyNutritionHistory,
  dummyLearningLogs,
  dummyPursuits,
  dummyCalendarItems,
  dummyFinanceLogs,
  dummyLendingRecords,
  dummySliceRepayments,
  dummyStravaActivities,
  dummyStravaStats,
} from '../data/dummydata';

const originalFetch = window.fetch;
let calendarItems = [...dummyCalendarItems];
const financeLogs = [...dummyFinanceLogs];
let lendingRecords = [...dummyLendingRecords];

// ── Guest nutrition analysis fixtures ──────────────────────────────────────
// Meal quality rotates through both formats the API can return (words and
// letter grades) so the UI's grade normalization is exercised in guest mode.
const GUEST_MEAL_QUALITIES = ['excellent', 'good', 'fair', 'A', 'B', 'C', 'poor'];

// The first meal of each guest day carries a full AI-analysis payload so the
// food-detail page (Items, glycaemic load, AI Insights) is demo-able as a guest.
const guestRichAnalysis = (carbsGrams: number, fatGrams: number) => ({
  total_summary: {
    carbs_g: carbsGrams,
    fats_g: fatGrams,
    fiber_g: 6.5,
    sugar_g: 9.2,
    sodium_mg: 310,
  },
  meal_items: [
    {
      name: 'Rolled oats (cooked in milk)',
      serving_size: '1 bowl (240 g)',
      confidence: 'high',
      calories: 220, protein: 9, carbs: 34, fat: 5, fiber: 4, sugar: 6, sodium: 105,
      clinical_item_flags: ['PROTECTIVE: Beta-glucan fiber supports a stable glucose response'],
    },
    {
      name: 'Mixed berries',
      serving_size: '80 g',
      confidence: 'high',
      calories: 45, protein: 1, carbs: 10, fat: 0, fiber: 3, sugar: 7, sodium: 1,
      clinical_item_flags: ['PROTECTIVE: Polyphenol-rich, low-glycaemic fruit'],
    },
    {
      name: 'Honey drizzle',
      serving_size: '1 tbsp (21 g)',
      confidence: 'medium',
      calories: 64, protein: 0, carbs: 17, fat: 0, fiber: 0, sugar: 17, sodium: 1,
      clinical_item_flags: ['MODERATE_RISK: Free sugars — keep to one serving'],
    },
  ],
  recomposition_assessment: {
    meal_quality: 'good',
    letter_grade: 'B',
    overall_score: 78,
    fitness_alignment:
      'Protein-forward start that supports your recomposition target — pairing it with a scoop of whey or soy isolate would push the meal to the 30 g protein sweet spot.',
    strengths: [
      'High satiety-per-calorie ratio from oat beta-glucan',
      'Morning protein spread supports muscle protein synthesis',
    ],
    concerns: ['Free sugar from honey uses up most of the day\'s added-sugar budget'],
    improvements: [
      'Swap honey for cinnamon to cut ~17 g of sugar',
      'Add a scoop of whey or soy isolate to reach 30 g protein',
    ],
  },
  acne_impact_assessment: {
    medical_analysis: [
      {
        condition: 'Acne / dermal inflammation',
        risk: 'moderate',
        findings: ['Dairy (milk) can elevate IGF-1 signalling in acne-prone individuals'],
        recommendations: ['Consider almond or oat milk during breakout weeks'],
      },
      {
        condition: 'Insulin sensitivity',
        risk: 'low',
        findings: ['Low overall glycaemic load with fiber buffering'],
        recommendations: [],
      },
    ],
    glycaemic_assessment: {
      total_meal_glycaemic_load: 14,
      gl_classification: 'Medium (GL 10–19)',
      insulin_impact_summary:
        'Moderate insulin response expected; oat fiber and berry polyphenols blunt the post-prandial spike.',
    },
  },
});

const enrichGuestMeal = (meal: { carbsGrams: number; fatGrams: number }, mealIndex: number, dayIndex: number) => ({
  mealQuality: GUEST_MEAL_QUALITIES[(dayIndex + mealIndex) % GUEST_MEAL_QUALITIES.length],
  ...(mealIndex === 0 ? guestRichAnalysis(meal.carbsGrams, meal.fatGrams) : {}),
});

// Guest finance account ("Total Balance") — a running balance moved by transactions.
const financeAccount: { balance: number; monthlyBudget: number } = { balance: 2450800, monthlyBudget: 20000 };

// Guest subscriptions (in-memory).
interface GuestSubscription { id: string; name: string; cost: number; billingDate: string | null }
let guestSubscriptions: GuestSubscription[] = [];

// ── Mind tab (guest, in-memory) ────────────────────────────────────────────
interface GuestMindEntry {
  id: string;
  type: string;
  text: string;
  reframedText?: string | null;
  distortionTag?: string | null;
  status: string;
  linkedTaskId?: string | null;
  valueTag?: string | null;
  pinned?: boolean;
  reviewDate?: string | null;
  wasParked?: boolean;
  date: string;
  createdAt: string;
  resolvedAt?: string | null;
}

// Local-date formatting (mirrors mindIsoDate) so "today" and date math stay consistent
// regardless of timezone — using toISOString() here would shift the date and mis-resurface parked worries.
const guestIso = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const guestToday = guestIso();
const guestAddDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return guestIso(d);
};

// ── Home route (guest, in-memory) ──────────────────────────────────────────
// Six seeded nights (today left unlogged so "Add last night" is demo-able).
// Sleep, focus, and mood are deliberately correlated so the insights digest
// has real patterns to find in guest mode.
interface GuestSleepEntry {
  id: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  durationMinutes: number;
  quality?: number | null;
  note?: string | null;
  source: string;
}

const guestSleepDuration = (bedtime: string, wakeTime: string): number => {
  const [bh, bm] = String(bedtime || '23:00').split(':').map(Number);
  const [wh, wm] = String(wakeTime || '07:00').split(':').map(Number);
  let minutes = wh * 60 + wm - (bh * 60 + bm);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes;
};

const guestSleepSeed: Array<[number, string, string, number]> = [
  [-6, '23:45', '07:15', 4],
  [-5, '01:30', '07:00', 2],
  [-4, '23:15', '06:45', 4],
  [-3, '00:45', '06:30', 3],
  [-2, '23:30', '07:20', 5],
  [-1, '01:15', '07:45', 3],
];

let guestSleepEntries: GuestSleepEntry[] = guestSleepSeed.map(([offset, bedtime, wakeTime, quality], i) => ({
  id: `sleep-guest-seed-${i}`,
  date: guestAddDays(guestToday, offset),
  bedtime,
  wakeTime,
  durationMinutes: guestSleepDuration(bedtime, wakeTime),
  quality,
  note: null,
  source: 'manual',
}));

const guestMoodSeed: Array<[number, number]> = [[-6, 4], [-5, 2], [-4, 4], [-3, 3], [-2, 5], [-1, 3]];
const guestMoodLogs = guestMoodSeed.map(([offset, moodScore]) => ({
  id: `daily-log-guest-${offset}`,
  date: guestAddDays(guestToday, offset),
  moodScore,
  moodNote: null,
}));

const guestFocusSeed: Array<[number, number, number]> = [
  [-6, 120, 3],
  [-5, 35, 1],
  [-4, 95, 2],
  [-3, 45, 1],
  [-2, 140, 3],
  [-1, 60, 2],
  [0, 25, 1],
];
const guestFocusHistory = guestFocusSeed.map(([offset, totalMinutes, sessions]) => ({
  date: guestAddDays(guestToday, offset),
  totalMinutes,
  sessions,
}));

let mindEntries: GuestMindEntry[] = [
  { id: 'mg-1', type: 'THOUGHT', text: "I'll never be good enough for a senior role.", status: 'OPEN', date: guestToday, createdAt: new Date().toISOString() },
  { id: 'mg-2', type: 'THOUGHT', text: 'Everyone at standup could tell I was nervous.', status: 'OPEN', date: guestToday, createdAt: new Date().toISOString() },
  { id: 'mg-3', type: 'THOUGHT', text: 'What if the calendar sync breaks in production?', status: 'CONVERTED', linkedTaskId: 'demo-task-1', date: guestToday, createdAt: new Date().toISOString(), resolvedAt: new Date().toISOString() },
  { id: 'mg-4', type: 'THOUGHT', text: 'I wasted the whole weekend.', reframedText: 'I rested — and rest is part of the work. I still logged two learnings.', distortionTag: 'All-or-nothing', status: 'RESOLVED', date: guestToday, createdAt: new Date().toISOString(), resolvedAt: new Date().toISOString() },
  { id: 'mg-5', type: 'THOUGHT', text: 'Am I falling behind my peers?', status: 'PARKED', reviewDate: guestAddDays(guestToday, 3), wasParked: true, date: guestToday, createdAt: new Date().toISOString() },
  { id: 'mg-6', type: 'THOUGHT', text: 'Did I say something wrong in that review comment?', status: 'PARKED', reviewDate: guestAddDays(guestToday, 1), wasParked: true, date: guestToday, createdAt: new Date().toISOString() },
  { id: 'mg-7', type: 'WIN', text: 'Fixed the recurrence bug everyone was avoiding.', status: 'OPEN', pinned: true, date: guestToday, createdAt: new Date().toISOString() },
  { id: 'mg-8', type: 'WIN', text: 'Ran 5k without stopping.', status: 'OPEN', date: guestToday, createdAt: new Date().toISOString() },
  { id: 'mg-9', type: 'GRATITUDE', text: 'A teammate covered for me without being asked.', status: 'OPEN', date: guestToday, createdAt: new Date().toISOString() },
];

export function enableGuestInterceptor() {
  window.fetch = async (...args) => {
    // Normalize an Axios fetch-adapter Request into (url, init) form so all the
    // url+init branch logic below (method via args[1].method, string body via
    // args[1].body) works unchanged for migrated service traffic. Legacy string
    // calls skip this untouched.
    if (typeof Request !== 'undefined' && args[0] instanceof Request) {
      const req = args[0];
      const bodyText = await req.clone().text();
      args = [req.url, { method: req.method, headers: req.headers, body: bodyText || undefined }] as Parameters<typeof fetch>;
    }
    const urlStr = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
    const urlObj = new URL(urlStr, window.location.origin || 'http://localhost');

    if (urlStr.includes('/api/v1/auth/')) {
      return originalFetch(...args);
    }

    const respondWith = (data: unknown) => {
      return Promise.resolve(new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    };

    // ── Mind tab ──────────────────────────────────────────────────────────
    if (urlStr.includes('/api/v1/mind/')) {
      const method = (args[1]?.method || 'GET').toUpperCase();
      const bodyOf = () => JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');

      if (urlStr.includes('/mind/mood')) {
        const body = bodyOf();
        return respondWith({ data: { moodScore: body.moodScore, moodNote: body.moodNote } });
      }

      if (urlStr.includes('/mind/summary')) {
        const thoughts = mindEntries.filter(e => e.type === 'THOUGHT');
        return respondWith({
          data: {
            focusMinutes: 312,
            tasksCompleted: 18,
            workouts: 4,
            learnings: 6,
            streakDays: 6,
            captured: thoughts.length,
            converted: thoughts.filter(e => e.status === 'CONVERTED').length,
            reframed: thoughts.filter(e => e.reframedText).length,
            released: thoughts.filter(e => e.status === 'RELEASED').length,
            moodScore: null,
          },
        });
      }

      const convertMatch = urlStr.match(/\/mind\/entries\/([^/?]+)\/convert/);
      if (convertMatch) {
        const entry = mindEntries.find(e => e.id === convertMatch[1]);
        if (entry) {
          entry.status = 'CONVERTED';
          entry.linkedTaskId = `task-guest-${Date.now()}`;
          entry.resolvedAt = new Date().toISOString();
        }
        return respondWith({ data: entry ?? null });
      }

      const statusMatch = urlStr.match(/\/mind\/entries\/([^/?]+)\/status/);
      if (statusMatch) {
        const entry = mindEntries.find(e => e.id === statusMatch[1]);
        const body = bodyOf();
        if (entry) {
          entry.status = body.status;
          if (body.status === 'PARKED') {
            entry.reviewDate = body.reviewDate ?? null;
            entry.wasParked = true;
          }
          if (body.status === 'OPEN') { entry.reviewDate = null; entry.resolvedAt = null; }
          if (body.status === 'RESOLVED') {
            if (body.reframedText != null) entry.reframedText = body.reframedText;
            if (body.distortionTag != null) entry.distortionTag = body.distortionTag;
            entry.resolvedAt = new Date().toISOString();
          }
          if (body.status === 'RELEASED') entry.resolvedAt = new Date().toISOString();
          if (body.pinned != null) entry.pinned = body.pinned;
        }
        return respondWith({ data: entry ?? null });
      }

      const entryMatch = urlStr.match(/\/mind\/entries\/([^/?]+)(?:\?|$)/);
      if (entryMatch) {
        const id = entryMatch[1];
        if (method === 'DELETE') {
          mindEntries = mindEntries.filter(e => e.id !== id);
          return respondWith({ data: null });
        }
        if (method === 'PUT') {
          const body = bodyOf();
          const entry = mindEntries.find(e => e.id === id);
          if (entry) {
            entry.text = body.text ?? entry.text;
            if (body.type) entry.type = body.type;
            if (body.valueTag !== undefined) entry.valueTag = body.valueTag;
            if (body.pinned !== undefined) entry.pinned = body.pinned;
          }
          return respondWith({ data: entry ?? null });
        }
      }

      if (urlStr.includes('/mind/entries')) {
        if (method === 'POST') {
          const body = bodyOf();
          const entry: GuestMindEntry = {
            id: `mind-guest-${Date.now()}`,
            type: (body.type || 'THOUGHT').toUpperCase(),
            text: (body.text || '').trim(),
            status: 'OPEN',
            valueTag: body.valueTag ?? null,
            pinned: body.pinned ?? false,
            date: body.date || guestToday,
            createdAt: new Date().toISOString(),
          };
          mindEntries.unshift(entry);
          return respondWith({ data: entry });
        }

        // GET — resurface any parked worry whose review date has arrived.
        mindEntries.forEach(e => {
          if (e.status === 'PARKED' && e.reviewDate && e.reviewDate <= guestToday) {
            e.status = 'OPEN';
            e.reviewDate = null;
          }
        });
        const typeParam = urlObj.searchParams.get('type');
        const statusParam = urlObj.searchParams.get('status');
        let result = [...mindEntries];
        if (typeParam) result = result.filter(e => e.type === typeParam);
        if (statusParam) result = result.filter(e => e.status === statusParam);
        return respondWith({ data: result });
      }
    }

    // User Profile API intercept
    if (urlStr.includes('/api/v1/users/profile')) {
      const method = (args[1]?.method || 'GET').toUpperCase();
      
      let profile = JSON.parse(localStorage.getItem('guest_user_profile') || 'null');
      if (!profile) {
        profile = {
          id: 'guest-user',
          displayName: 'Guest User',
          avatarUrl: 'luffy',
          email: 'guest@example.com',
          bio: 'Exploring the dashboard in guest mode.',
          timezone: 'GMT-8',
          workingHours: '10 AM - 6 PM',
          title: 'Guest Explorer',
          status: 'Online',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          physicalMetrics: {
            age: 28,
            gender: 'MALE',
            height: 180,
            weight: 75,
          },
          activityLevel: 'MODERATELY_ACTIVE',
          fitnessGoal: 'MAINTAIN_WEIGHT',
          medicalConditions: ['Vegetarian'],
          bmi: 23.1,
          bmr: 1750,
          tdee: 2700,
          dynamicTargets: {
            calculatedCalories: 2700,
            calculatedProtein: 150,
            calculatedCarbs: 335,
            calculatedFat: 85,
          }
        };
        localStorage.setItem('guest_user_profile', JSON.stringify(profile));
      }

      if (method === 'PUT') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        profile = { ...profile, ...body, updatedAt: new Date().toISOString() };
        
        if (body.physicalMetrics) {
           const height = body.physicalMetrics.height || profile.physicalMetrics.height;
           const weight = body.physicalMetrics.weight || profile.physicalMetrics.weight;
           if (height && weight) {
              profile.bmi = parseFloat((weight / ((height / 100) * (height / 100))).toFixed(1));
           }
        }
        localStorage.setItem('guest_user_profile', JSON.stringify(profile));
      }

      return respondWith({ data: profile });
    }

    // Google Calendar API intercept
    if (urlStr.includes('/api/v1/google-calendar/auth/status')) {
      return respondWith({
        data: {
          connected: false,
          accounts: []
        }
      });
    }

    if (urlStr.includes('/api/v1/google-calendar/auth/url')) {
      return respondWith({
        data: {
          url: 'https://accounts.google.com/o/oauth2/v2/auth?dummy'
        }
      });
    }

    if (urlStr.includes('/api/v1/google-calendar/auth/disconnect')) {
      return respondWith({ data: { status: 'disconnected' } });
    }

    if (urlStr.includes('/api/v1/google-calendar/sync')) {
      return respondWith({ data: { status: 'synced' } });
    }

    // GitHub API intercept
    if (urlStr.includes('api.github.com/users/Eccentric-Harry/repos')) {
      return respondWith(dummyGithubRepos);
    }
    if (urlStr.includes('api.github.com/users/Eccentric-Harry')) {
      return respondWith(dummyGithubProfile);
    }

    // LeetCode API intercept
    if (urlStr.includes('leetcode-api-faisalshohag.vercel.app')) {
      return respondWith(dummyLeetcodeStats);
    }
    if (urlStr.includes('alfa-leetcode-api.onrender.com')) {
      return respondWith(dummyLeetcodeProfile);
    }

    // Local API intercept
    if (urlStr.includes('/api/v1/dashboard/learnings-summary')) {
      return respondWith({ data: dummyLearningsSummary });
    }
    if (urlStr.includes('/api/v1/learnings/tasks')) {
      let tasks = [...dummyTasks];
      const tasksDateParam = urlObj.searchParams.get('date');
      const tasksStartDate = urlObj.searchParams.get('startDate');
      const tasksEndDate = urlObj.searchParams.get('endDate');

      if (tasksDateParam) {
        tasks = tasks.filter(t => t.date === tasksDateParam);
      } else if (tasksStartDate && tasksEndDate) {
        tasks = tasks.filter(t => t.date >= tasksStartDate && t.date <= tasksEndDate);
      }

      return respondWith({ data: tasks });
    }
    if (urlStr.includes('/api/v1/dashboard') && !urlStr.includes('-summary')) {
      const dateParam = urlObj.searchParams.get('date');
      const targetDate = dateParam || new Date().toISOString().split('T')[0];
      const dayData = dummyNutritionHistory.find(d => d.date === targetDate) || dummyNutritionHistory[dummyNutritionHistory.length - 1];

      // Map dynamic deep data back into expected standard dashboard shape
      const mappedHealth = {
        ...dummyDashboardData.health,
        dailyFood: { calories: dayData.dailyMetrics.caloriesConsumed, calorieGoal: dayData.dailyMetrics.calorieGoal },
        circularGoals: [
          { label: 'Protein', value: dayData.dailyMetrics.macroBreakdown.protein.logged, target: dayData.dailyMetrics.macroBreakdown.protein.target, unit: 'g' },
          { label: 'Carbs', value: dayData.dailyMetrics.macroBreakdown.carbs.logged, target: dayData.dailyMetrics.macroBreakdown.carbs.target, unit: 'g' },
          { label: 'Fat', value: dayData.dailyMetrics.macroBreakdown.fat.logged, target: dayData.dailyMetrics.macroBreakdown.fat.target, unit: 'g' }
        ],
        foodEntries: dayData.additionalInfo.mealLogs.map((m, mIdx) => ({
          id: m.id,
          description: m.mealName,
          mealType: m.type,
          proteinGrams: m.proteinGrams,
          calories: m.calories,
          ...enrichGuestMeal(m, mIdx, dummyNutritionHistory.indexOf(dayData))
        })),
        deepAnalysis: dayData // Attached for deep UI components to consume
      };

      return respondWith({ data: { ...dummyDashboardData, health: mappedHealth } });
    }
    if (urlStr.includes('/api/v1/workouts/activities/stats')) {
       return respondWith({ data: dummyStravaStats });
    }
    if (urlStr.includes('/api/v1/workouts/activities')) {
       return respondWith({ data: dummyStravaActivities });
    }
    if (urlStr.includes('/api/v1/workouts/featured-embed')) {
       return respondWith({ data: { id: '18760429131', token: 'mJPz6Bth1sW7HIfIaScppJ6ntZVYan_ASUFl2sV_px4' } });
    }
    if (urlStr.includes('/api/v1/workouts') && !urlStr.includes('activities')) {
      return respondWith({ data: dummyWorkoutsData });
    }
    
    // Nutrition: trend summary (ProteinTrendCard + Home hero via fetchNutritionSummary)
    if (urlStr.includes('/api/v1/dashboard/nutrition-summary')) {
      const dailyProtein: Record<string, number> = {};
      const dailyCalories: Record<string, number> = {};
      dummyNutritionHistory.forEach(day => {
        dailyProtein[day.date] = day.dailyMetrics.macroBreakdown.protein.logged;
        dailyCalories[day.date] = day.dailyMetrics.caloriesConsumed;
      });
      const summaryDate = urlObj.searchParams.get('date') || guestToday;
      const summaryDay = dummyNutritionHistory.find(d => d.date === summaryDate) || dummyNutritionHistory[dummyNutritionHistory.length - 1];
      return respondWith({
        data: {
          date: summaryDate,
          dailyProtein,
          dailyCalories,
          mealTypeBreakdown: {},
          todayTotalCalories: summaryDay.dailyMetrics.caloriesConsumed,
          todayTotalProtein: summaryDay.dailyMetrics.macroBreakdown.protein.logged,
          calorieGoal: summaryDay.dailyMetrics.calorieGoal,
          proteinGoal: summaryDay.dailyMetrics.macroBreakdown.protein.target,
        },
      });
    }

    // Health: Food entries (used by FoodLogCard, MacroBalanceCard, NutritionHeader via fetchFoodEntries)
    if (urlStr.includes('/api/v1/health/food')) {
      const method = (args[1]?.method || 'GET').toUpperCase();

      if (method === 'POST') {
        const bodyStr = typeof args[1]?.body === 'string' ? args[1].body : '{}';
        return respondWith({ data: { id: `meal-guest-${Date.now()}`, ...JSON.parse(bodyStr) } });
      }
      if (method === 'DELETE' || method === 'PUT') {
        return respondWith({ success: true });
      }

      const daysParam = urlObj.searchParams.get('days');
      const startDate = urlObj.searchParams.get('startDate');
      const endDate = urlObj.searchParams.get('endDate');

      let entries = dummyNutritionHistory.flatMap((day, dayIdx) =>
        day.additionalInfo.mealLogs.map((m, mIdx) => ({
          id: m.id,
          description: m.mealName,
          mealType: m.type,
          proteinGrams: m.proteinGrams,
          calories: m.calories,
          date: day.date,
          ...enrichGuestMeal(m, mIdx, dayIdx)
        }))
      );

      if (startDate && endDate) {
        entries = entries.filter(e => e.date >= startDate && e.date <= endDate);
      } else if (daysParam) {
        const days = parseInt(daysParam, 10);
        if (!isNaN(days)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          entries = entries.filter(e => e.date >= cutoff.toISOString().split('T')[0]);
        }
      }

      return respondWith({ data: entries });
    }

    // Health: Hydration range (used by the nutrition insights engine via fetchHydrationRange)
    if (urlStr.includes('/api/v1/health/hydration/range')) {
      const overrides: Record<string, number> = JSON.parse(localStorage.getItem('guest_hydration_overrides') || '{}');
      const daysParam = urlObj.searchParams.get('days');
      const startDate = urlObj.searchParams.get('startDate');
      const endDate = urlObj.searchParams.get('endDate');

      let history = dummyNutritionHistory;
      if (startDate) {
        history = history.filter((d) => d.date >= startDate && (!endDate || d.date <= endDate));
      } else if (daysParam) {
        const n = parseInt(daysParam, 10);
        if (!isNaN(n)) history = history.slice(-n);
      } else {
        history = history.slice(-14);
      }

      const records = history.map((day) => {
        const baseMl = day.additionalInfo.hydrationLogs.reduce((sum, log) => sum + log.amountOunces * 29.5735, 0);
        const totalMl = Math.max(0, baseMl + (overrides[day.date] || 0));
        return {
          date: day.date,
          waterIntakeMl: Math.round(totalMl),
          targetMl: 4000,
          progress: Math.min(100, Math.round((totalMl / 4000) * 100)),
        };
      });

      return respondWith({ data: records });
    }

    // Health: Hydration (used by HydrationCard via fetchHydration)
    if (urlStr.includes('/api/v1/health/hydration')) {
      const method = (args[1]?.method || 'GET').toUpperCase();

      const getOverride = () => JSON.parse(localStorage.getItem('guest_hydration_overrides') || '{}');
      const setOverride = (overrides: Record<string, number>) => localStorage.setItem('guest_hydration_overrides', JSON.stringify(overrides));

      if (method === 'POST') {
        const amountStr = urlObj.searchParams.get('amount');
        const dateForAdd = urlObj.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const amount = parseInt(amountStr || '0', 10);
        if (!isNaN(amount) && amount !== 0) {
          const overrides = getOverride();
          overrides[dateForAdd] = (overrides[dateForAdd] || 0) + amount;
          setOverride(overrides);
        }
        return respondWith({ success: true });
      }

      const dateParam = urlObj.searchParams.get('date') || new Date().toISOString().split('T')[0];
      const dayData = dummyNutritionHistory.find(d => d.date === dateParam) || dummyNutritionHistory[dummyNutritionHistory.length - 1];
      const baseMl = dayData.additionalInfo.hydrationLogs.reduce((sum, log) => sum + (log.amountOunces * 29.5735), 0);
      const overrides = getOverride();
      const totalMl = Math.max(0, baseMl + (overrides[dateParam] || 0));
      return respondWith({
        data: {
          waterIntakeMl: Math.round(totalMl),
          targetMl: 4000,
          date: dateParam,
          progress: Math.min(100, Math.round((totalMl / 4000) * 100))
        }
      });
    }

    // Finance: month spending summary (Home rollup + insights via fetchSpendingSummary)
    if (urlStr.includes('/api/v1/dashboard/spending-summary')) {
      const month = urlObj.searchParams.get('month') || guestToday.slice(0, 7);
      const monthLogs = dummyFinanceLogs.filter(l => l.date.startsWith(month));
      const totalSpent = monthLogs.reduce((sum, l) => sum + (l.dailyTotals?.totalExpense || 0), 0) || 12450;
      const monthlyBudget = 20000;
      return respondWith({
        data: {
          month,
          totalSpent,
          monthlyBudget,
          budgetRemaining: monthlyBudget - totalSpent,
          budgetUtilization: (totalSpent / monthlyBudget) * 100,
          categoryBreakdown: {},
        },
      });
    }

    // ── Home route: sleep, mood range, focus history ─────────────────────
    if (urlStr.includes('/api/v1/sleep')) {
      const method = (args[1]?.method || 'GET').toUpperCase();
      const bodyOf = () => JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');

      if (method === 'POST' || method === 'PUT') {
        const body = bodyOf();
        const duration = guestSleepDuration(body.bedtime, body.wakeTime);
        const existing = guestSleepEntries.find(e => e.date === body.date);
        if (existing) {
          Object.assign(existing, body, { durationMinutes: duration, source: body.source || 'manual' });
          return respondWith({ data: existing });
        }
        const entry = {
          id: `sleep-guest-${Date.now()}`,
          date: body.date,
          bedtime: body.bedtime,
          wakeTime: body.wakeTime,
          durationMinutes: duration,
          quality: body.quality ?? null,
          note: body.note ?? null,
          source: body.source || 'manual',
        };
        guestSleepEntries.push(entry);
        guestSleepEntries.sort((a, b) => a.date.localeCompare(b.date));
        return respondWith({ data: entry });
      }
      if (method === 'DELETE') {
        const idMatch = urlStr.match(/\/sleep\/([^/?]+)/);
        guestSleepEntries = guestSleepEntries.filter(e => e.id !== idMatch?.[1]);
        return respondWith({ data: null });
      }
      const start = urlObj.searchParams.get('startDate') || '0000-01-01';
      const end = urlObj.searchParams.get('endDate') || '9999-12-31';
      return respondWith({ data: guestSleepEntries.filter(e => e.date >= start && e.date <= end) });
    }

    if (urlStr.includes('/api/v1/daily-log/range')) {
      const start = urlObj.searchParams.get('startDate') || '0000-01-01';
      const end = urlObj.searchParams.get('endDate') || '9999-12-31';
      return respondWith({ data: guestMoodLogs.filter(m => m.date >= start && m.date <= end) });
    }

    if (urlStr.includes('/api/v1/focus/history')) {
      const start = urlObj.searchParams.get('startDate') || '0000-01-01';
      const end = urlObj.searchParams.get('endDate') || '9999-12-31';
      return respondWith({ data: guestFocusHistory.filter(f => f.date >= start && f.date <= end) });
    }

    // Learnings: logs (used by LearningsLogCard, CategoryBreakdownCard, LearningsHeader, CalendarSelectorCard)
    if (urlStr.includes('/api/v1/learnings') && !urlStr.includes('/tasks') && !urlStr.includes('/pursuits')) {
      const method = (args[1]?.method || 'GET').toUpperCase();

      if (method === 'POST') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        return respondWith({ data: { id: `ll-guest-${Date.now()}`, ...body, createdAt: new Date().toISOString() } });
      }
      if (method === 'PUT' || method === 'DELETE') {
        return respondWith({ success: true });
      }

      let logs = [...dummyLearningLogs];
      const dateParam = urlObj.searchParams.get('date');
      const startDate = urlObj.searchParams.get('startDate');
      const endDate = urlObj.searchParams.get('endDate');

      if (dateParam) {
        logs = logs.filter(l => l.date === dateParam);
      } else if (startDate && endDate) {
        logs = logs.filter(l => l.date >= startDate && l.date <= endDate);
      }
      // Return sorted newest first for the log card
      logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      return respondWith({ data: logs });
    }

    // Learnings: pursuits (used by ActiveStudyQueue)
    if (urlStr.includes('/api/v1/pursuits')) {
      const method = (args[1]?.method || 'GET').toUpperCase();

      if (method === 'GET') {
        return respondWith({ data: dummyPursuits });
      }

      if (method === 'POST') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        const newPursuit = {
          id: `p-guest-${Date.now()}`,
          title: body.title || 'New Pursuit',
          category: body.category || 'Development',
          notionUrl: 'https://notion.so/guest-pursuit',
          status: 'ACTIVE' as const,
          steps: (body.steps || []).map((text: string, i: number) => ({
            id: `ps-guest-${Date.now()}-${i}`,
            text,
            isCompleted: false,
          })),
        };
        return respondWith({ data: newPursuit });
      }

      if (method === 'PATCH') {
        // Toggle step completion — return the pursuit to match API contract
        const match = urlStr.match(/\/pursuits\/([^/]+)\/steps\/([^/]+)/);
        if (match) {
          const pursuitId = match[1];
          const stepId = match[2];
          const pursuit = dummyPursuits.find(p => p.id === pursuitId);
          if (pursuit) {
            const updatedSteps = pursuit.steps.map(s =>
              s.id === stepId ? { ...s, isCompleted: !s.isCompleted } : s
            );
            const allDone = updatedSteps.length > 0 && updatedSteps.every(s => s.isCompleted);
            return respondWith({
              data: { ...pursuit, steps: updatedSteps, status: allDone ? 'COMPLETED' : 'ACTIVE' },
            });
          }
        }
        return respondWith({ data: dummyPursuits[0] });
      }

      if (method === 'PUT') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        return respondWith({ data: { ...dummyPursuits[0], ...body } });
      }

      if (method === 'DELETE') {
        return respondWith({ success: true });
      }

      return respondWith({ data: dummyPursuits });
    }

    // Focus session (used by FocusBlockWidget via FocusContext)
    if (urlStr.includes('/api/v1/focus')) {
      const method = (args[1]?.method || 'GET').toUpperCase();
      const LS_KEY = 'guest_focus_session';

      const getSession = () => {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : null;
      };
      const saveSession = (s: unknown) => localStorage.setItem(LS_KEY, JSON.stringify(s));

      if (method === 'GET' && urlStr.includes('/current')) {
        return respondWith({ data: getSession() });
      }

      if (method === 'POST' && urlStr.includes('/start')) {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        const durationMs = (body.durationMinutes || 25) * 60000;
        const now = new Date();
        const session = {
          id: `focus-guest-${Date.now()}`,
          activePursuit: body.activePursuit || 'Coding',
          durationMinutes: body.durationMinutes || 25,
          status: 'RUNNING',
          startTime: now.toISOString(),
          endTime: new Date(now.getTime() + durationMs).toISOString(),
        };
        saveSession(session);
        return respondWith({ data: session });
      }

      if (method === 'POST' && urlStr.includes('/pause')) {
        const stored = getSession();
        if (stored && stored.endTime) {
          const remainingSec = Math.max(0, Math.round((new Date(stored.endTime).getTime() - Date.now()) / 1000));
          const session = { ...stored, status: 'PAUSED', endTime: undefined, remainingSecondsOnPause: remainingSec };
          saveSession(session);
          return respondWith({ data: session });
        }
        return respondWith({ data: null });
      }

      if (method === 'POST' && urlStr.includes('/resume')) {
        const stored = getSession();
        if (stored && stored.remainingSecondsOnPause != null) {
          const remainingMs = stored.remainingSecondsOnPause * 1000;
          const now = new Date();
          const session = {
            ...stored,
            status: 'RUNNING',
            endTime: new Date(now.getTime() + remainingMs).toISOString(),
            remainingSecondsOnPause: undefined,
          };
          saveSession(session);
          return respondWith({ data: session });
        }
        return respondWith({ data: null });
      }

      if (method === 'POST' && urlStr.includes('/cancel')) {
        localStorage.removeItem(LS_KEY);
        return respondWith({ success: true });
      }

      if (method === 'POST' && urlStr.includes('/complete')) {
        const stored = getSession();
        const session = stored ? { ...stored, status: 'COMPLETED' } : null;
        localStorage.removeItem(LS_KEY);
        return respondWith({ data: session });
      }

      return respondWith({ data: null });
    }

    // Calendar: range GET
    if (urlStr.includes('/api/v1/calendar/items/range')) {
      const startDate = urlObj.searchParams.get('startDate');
      const endDate = urlObj.searchParams.get('endDate');
      let filtered = [...calendarItems];
      if (startDate && endDate) {
        filtered = filtered.filter(item => item.date >= startDate && item.date <= endDate);
      }
      return respondWith({ data: filtered });
    }

    // Calendar: toggle PATCH
    const toggleMatch = urlStr.match(/\/api\/v1\/calendar\/items\/([^/]+)\/toggle/);
    if (toggleMatch) {
      const id = toggleMatch[1];
      const dateParam = urlObj.searchParams.get('date');
      const item = calendarItems.find(i => i.id === id);
      if (item) {
        if (dateParam && item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE') {
          const toggleKey = `guest_calendar_toggle_${id}_${dateParam}`;
          const toggled = localStorage.getItem(toggleKey) === 'true';
          localStorage.setItem(toggleKey, String(!toggled));
          return respondWith({ data: { ...item, completed: !toggled, date: dateParam } });
        }
        item.completed = !item.completed;
        return respondWith({ data: item });
      }
      return respondWith({ data: null });
    }

    // Calendar: PUT/DELETE by ID
    const itemMatch = urlStr.match(/\/api\/v1\/calendar\/items\/([^/?]+)(?:\?|$)/);
    if (itemMatch) {
      const id = itemMatch[1];
      const method = (args[1]?.method || 'GET').toUpperCase();

      if (method === 'DELETE') {
        const dateParam = urlObj.searchParams.get('date');
        if (dateParam) {
          const delKey = `guest_calendar_deleted_${id}_${dateParam}`;
          localStorage.setItem(delKey, 'true');
          return respondWith({ success: true });
        }
        calendarItems = calendarItems.filter(i => i.id !== id);
        return respondWith({ success: true });
      }

      if (method === 'PUT') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        const index = calendarItems.findIndex(i => i.id === id);
        if (index !== -1) {
          calendarItems[index] = { ...calendarItems[index], ...body };
          return respondWith({ data: calendarItems[index] });
        }
        return respondWith({ data: null });
      }
    }

    // Calendar: POST new item
    if (urlStr.includes('/api/v1/calendar/items') && (args[1]?.method || 'GET').toUpperCase() === 'POST') {
      const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
      const newItem = {
        ...body,
        id: `ci-guest-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      calendarItems.push(newItem);
      return respondWith({ data: newItem });
    }

    // Finance: daily logs GET
    if (urlStr.includes('/api/v1/finance/daily-logs')) {
      const daysParam = urlObj.searchParams.get('days');
      let logs = [...financeLogs];
      if (daysParam) {
        const days = parseInt(daysParam, 10);
        if (!isNaN(days)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          const cutoffStr = cutoff.toISOString().split('T')[0];
          logs = logs.filter(l => l.date >= cutoffStr);
        }
      }
      return respondWith({ data: logs });
    }

    // Finance: transactions CRUD
    const txMatch = urlStr.match(/\/api\/v1\/finance\/transactions\/([^/]+)/);
    if (txMatch) {
      const txId = txMatch[1];
      const method = (args[1]?.method || 'GET').toUpperCase();

      if (method === 'DELETE') {
        for (const log of financeLogs) {
          for (const category of Object.keys(log.transactions)) {
            log.transactions[category] = log.transactions[category].filter(tx => tx.id !== txId);
          }
        }
        return respondWith({ success: true });
      }

      if (method === 'PUT') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        for (const log of financeLogs) {
          for (const category of Object.keys(log.transactions)) {
            const idx = log.transactions[category].findIndex(tx => tx.id === txId);
            if (idx !== -1) {
              log.transactions[category][idx] = {
                ...log.transactions[category][idx],
                description: body.description,
                amount: body.amount,
              };
              return respondWith({ data: log.transactions[category][idx] });
            }
          }
        }
        return respondWith({ data: null });
      }
    }

    if (urlStr.includes('/api/v1/finance/transactions') && (args[1]?.method || 'GET').toUpperCase() === 'POST') {
      const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
      const txDate = body.date || new Date().toISOString().split('T')[0];
      let log = financeLogs.find(l => l.date === txDate);
      if (!log) {
        log = {
          id: `fl-guest-${Date.now()}`,
          date: txDate,
          dailyTotals: { totalExpense: 0, totalIncome: 0 },
          transactions: {},
        };
        financeLogs.push(log);
      }

      const isIncome = String(body.type).toLowerCase() === 'income';
      const newTx = {
        id: `ftx-guest-${Date.now()}`,
        description: body.description,
        amount: body.amount,
        type: isIncome ? 'Income' : 'Expense',
        timestamp: new Date().toISOString(),
      };

      const category = body.category || 'Miscellaneous';
      if (!log.transactions[category]) {
        log.transactions[category] = [];
      }
      log.transactions[category].push(newTx);

      if (isIncome) {
        log.dailyTotals.totalIncome += body.amount;
        financeAccount.balance += body.amount;
      } else {
        log.dailyTotals.totalExpense += body.amount;
        financeAccount.balance -= body.amount;
      }

      return respondWith({ data: newTx });
    }

    // Finance: account / Total Balance
    if (urlStr.includes('/api/v1/finance/budget')) {
      const method = (args[1]?.method || 'GET').toUpperCase();
      if (method === 'PUT') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        if (typeof body.monthlyBudget === 'number') {
          financeAccount.monthlyBudget = body.monthlyBudget;
        }
      }
      return respondWith({ data: { balance: financeAccount.balance, monthlyBudget: financeAccount.monthlyBudget ?? 20000 } });
    }

    if (urlStr.includes('/api/v1/finance/account')) {
      const method = (args[1]?.method || 'GET').toUpperCase();
      if (method === 'PUT') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        if (typeof body.balance === 'number') {
          financeAccount.balance = body.balance;
        }
        return respondWith({ data: { balance: financeAccount.balance, monthlyBudget: financeAccount.monthlyBudget ?? 20000 } });
      }
      return respondWith({ data: { balance: financeAccount.balance, monthlyBudget: financeAccount.monthlyBudget ?? 20000 } });
    }

    // Subscriptions CRUD
    const subDeleteMatch = urlStr.match(/\/api\/v1\/subscriptions\/([^/]+)/);
    if (subDeleteMatch && (args[1]?.method || '').toUpperCase() === 'DELETE') {
      guestSubscriptions = guestSubscriptions.filter(s => s.id !== subDeleteMatch[1]);
      return respondWith({ data: null });
    }
    if (urlStr.includes('/api/v1/subscriptions')) {
      const method = (args[1]?.method || 'GET').toUpperCase();
      if (method === 'POST') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        const newSub: GuestSubscription = {
          id: `sub-guest-${Date.now()}`,
          name: body.name,
          cost: body.cost,
          billingDate: body.billingDate || null,
        };
        guestSubscriptions.push(newSub);
        return respondWith({ data: newSub });
      }
      return respondWith({ data: guestSubscriptions });
    }

    // Finance: slice repayments GET
    if (urlStr.includes('/api/v1/finance/slice-repayments')) {
      return respondWith({ data: dummySliceRepayments });
    }

    // Finance: lending CRUD
    const lendingToggleMatch = urlStr.match(/\/api\/v1\/finance\/lending\/([^/]+)\/toggle/);
    if (lendingToggleMatch) {
      const id = lendingToggleMatch[1];
      const record = lendingRecords.find(r => r.id === id);
      if (record) {
        record.status = record.status === 'Pending' ? 'Repaid' : 'Pending';
        return respondWith({ data: record });
      }
      return respondWith({ data: null });
    }

    const lendingMatch = urlStr.match(/\/api\/v1\/finance\/lending\/([^/]+)/);
    if (lendingMatch) {
      const id = lendingMatch[1];
      const method = (args[1]?.method || 'GET').toUpperCase();

      if (method === 'DELETE') {
        lendingRecords = lendingRecords.filter(r => r.id !== id);
        return respondWith({ success: true });
      }

      if (method === 'PUT') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        const index = lendingRecords.findIndex(r => r.id === id);
        if (index !== -1) {
          lendingRecords[index] = { ...lendingRecords[index], ...body };
          return respondWith({ data: lendingRecords[index] });
        }
        return respondWith({ data: null });
      }
    }

    if (urlStr.includes('/api/v1/finance/lending')) {
      const method = (args[1]?.method || 'GET').toUpperCase();

      if (method === 'GET') {
        return respondWith({ data: lendingRecords });
      }

      if (method === 'POST') {
        const body = JSON.parse(typeof args[1]?.body === 'string' ? args[1].body : '{}');
        const newRecord = {
          id: `lr-guest-${Date.now()}`,
          borrower: body.borrower,
          amount: body.amount,
          date: body.date || new Date().toISOString().split('T')[0],
          dueDate: body.dueDate,
          status: 'Pending' as const,
          notes: body.notes,
        };
        lendingRecords.push(newRecord);
        return respondWith({ data: newRecord });
      }
    }

    // Fallback
    if (args[1]?.method === 'GET' || !args[1]?.method) {
      return respondWith({ data: [] });
    }
    return respondWith({ success: true, data: {} });
  };
}

export function disableGuestInterceptor() {
  window.fetch = originalFetch;
}
