// Strictly-typed Goals service — one-liners over instance.safeCall<T>().
// Every call that changes progress sends `today` (the client's local day, which knows
// about the 04:00 rollover) and gets that goal's freshly judged view back.
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type {
  CampChestOpenResult,
  CampLookPayload,
  CampQuestClaimResult,
  CampView,
  Goal,
  GoalBoard,
  GoalCheckInPayload,
  GoalJourney,
  GoalKit,
  GoalKitPagePayload,
  GoalPayload,
  GoalProgressView,
  GoalStatus,
} from '../types/goals';
import * as E from './endpoints/goals-endpoints';

export interface GoalsServiceInterface {
  getBoard(today: string): Promise<SafeResult<GoalBoard>>;
  listGoals(): Promise<SafeResult<Goal[]>>;
  createGoal(payload: GoalPayload, today: string): Promise<SafeResult<GoalProgressView>>;
  updateGoal(id: string, payload: GoalPayload, today: string): Promise<SafeResult<GoalProgressView>>;
  setStatus(id: string, status: GoalStatus): Promise<SafeResult<Goal>>;
  deleteGoal(id: string): Promise<SafeResult<null>>;
  addCheckIn(id: string, payload: GoalCheckInPayload, today: string): Promise<SafeResult<GoalProgressView>>;
  deleteCheckIn(id: string, checkInId: string, today: string): Promise<SafeResult<GoalProgressView>>;
  getJourney(id: string, today: string): Promise<SafeResult<GoalJourney>>;
  saveKitPage(id: string, page: string, payload: GoalKitPagePayload): Promise<SafeResult<GoalKit>>;
  getCamp(today: string): Promise<SafeResult<CampView>>;
  openChest(today: string): Promise<SafeResult<CampChestOpenResult>>;
  claimQuest(questId: string, today: string): Promise<SafeResult<CampQuestClaimResult>>;
  buyItem(itemId: string, today: string): Promise<SafeResult<CampView>>;
  setLook(look: CampLookPayload, today: string): Promise<SafeResult<CampView>>;
}

export const goalsService: GoalsServiceInterface = {
  getBoard: (today) => instance.safeCall<GoalBoard>(E.API_GET_GOAL_BOARD, { query: { today } }),
  listGoals: () => instance.safeCall<Goal[]>(E.API_LIST_GOALS),
  createGoal: (payload, today) =>
    instance.safeCall<GoalProgressView>(E.API_CREATE_GOAL, { body: payload, query: { today } }),
  updateGoal: (id, payload, today) =>
    instance.safeCall<GoalProgressView>(E.API_UPDATE_GOAL, { params: { id }, body: payload, query: { today } }),
  setStatus: (id, status) => instance.safeCall<Goal>(E.API_SET_GOAL_STATUS, { params: { id }, body: { status } }),
  deleteGoal: (id) => instance.safeCall<null>(E.API_DELETE_GOAL, { params: { id } }),
  addCheckIn: (id, payload, today) =>
    instance.safeCall<GoalProgressView>(E.API_ADD_GOAL_CHECKIN, { params: { id }, body: payload, query: { today } }),
  deleteCheckIn: (id, checkInId, today) =>
    instance.safeCall<GoalProgressView>(E.API_DELETE_GOAL_CHECKIN, { params: { id, checkInId }, query: { today } }),
  getJourney: (id, today) => instance.safeCall<GoalJourney>(E.API_GET_GOAL_JOURNEY, { params: { id }, query: { today } }),
  saveKitPage: (id, page, payload) => instance.safeCall<GoalKit>(E.API_SAVE_GOAL_KIT_PAGE, { params: { id, page }, body: payload }),
  getCamp: (today) => instance.safeCall<CampView>(E.API_GET_CAMP, { query: { today } }),
  openChest: (today) => instance.safeCall<CampChestOpenResult>(E.API_OPEN_CAMP_CHEST, { query: { today } }),
  claimQuest: (questId, today) =>
    instance.safeCall<CampQuestClaimResult>(E.API_CLAIM_CAMP_QUEST, { body: { questId }, query: { today } }),
  buyItem: (itemId, today) => instance.safeCall<CampView>(E.API_BUY_CAMP_ITEM, { body: { itemId }, query: { today } }),
  setLook: (look, today) => instance.safeCall<CampView>(E.API_SET_CAMP_LOOK, { body: look, query: { today } }),
};
