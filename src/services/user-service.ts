// Strictly-typed User/profile service — one-liners over instance.safeCall<T>().
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { UserProfile } from '../types/user';
import * as E from './endpoints/user-endpoints';

export interface UserServiceInterface {
  getProfile(): Promise<SafeResult<UserProfile>>;
  updateProfile(payload: Partial<UserProfile>): Promise<SafeResult<UserProfile>>;
}

export const userService: UserServiceInterface = {
  getProfile: () => instance.safeCall<UserProfile>(E.API_GET_USER_PROFILE),
  updateProfile: (payload) => instance.safeCall<UserProfile>(E.API_UPDATE_USER_PROFILE, { body: payload }),
};
