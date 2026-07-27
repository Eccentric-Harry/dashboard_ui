// Tasks domain types (tasks live under /learnings/tasks). Re-exported from lib/api
// during migration; Phase-B cleanup moves the definitions here.

export type { DailyTask, SubTask, TaskHistoryEvent } from '../lib/api';

import type { DailyTask } from '../lib/api';

export type TaskRequest = Omit<DailyTask, 'id'>;
