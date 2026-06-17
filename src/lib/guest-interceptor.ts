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

export function enableGuestInterceptor() {
  window.fetch = async (...args) => {
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
        foodEntries: dayData.additionalInfo.mealLogs.map(m => ({
          id: m.id,
          description: m.mealName,
          mealType: m.type,
          proteinGrams: m.proteinGrams,
          calories: m.calories
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
    
    // Nutrition: Protein trend summary (used by ProteinTrendCard via fetchNutritionSummary)
    if (urlStr.includes('/api/v1/dashboard/nutrition-summary')) {
      const dailyProtein: Record<string, number> = {};
      dummyNutritionHistory.forEach(day => {
        dailyProtein[day.date] = day.dailyMetrics.macroBreakdown.protein.logged;
      });
      return respondWith({ data: { dailyProtein } });
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

      let entries = dummyNutritionHistory.flatMap(day =>
        day.additionalInfo.mealLogs.map(m => ({
          id: m.id,
          description: m.mealName,
          mealType: m.type,
          proteinGrams: m.proteinGrams,
          calories: m.calories,
          date: day.date
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

      const newTx = {
        id: `ftx-guest-${Date.now()}`,
        description: body.description,
        amount: body.amount,
        timestamp: new Date().toISOString(),
      };

      const category = body.category || 'Miscellaneous';
      if (!log.transactions[category]) {
        log.transactions[category] = [];
      }
      log.transactions[category].push(newTx);

      if (body.type === 'income') {
        log.dailyTotals.totalIncome += body.amount;
      } else {
        log.dailyTotals.totalExpense += body.amount;
      }

      return respondWith({ data: newTx });
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
