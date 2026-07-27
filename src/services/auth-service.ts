// Strictly-typed Auth service. login/signup bypass the gatekeeper (see
// axios-client.ts's GATE_BYPASS) since there's no token yet to gate on.
import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type { AuthSession } from '../types/auth';
import * as E from './endpoints/auth-endpoints';

export interface AuthServiceInterface {
  verifyPasscode(passcode: string): Promise<SafeResult<unknown>>;
  login(username: string, passcode: string): Promise<SafeResult<AuthSession>>;
  signup(username: string, displayName: string, passcode: string): Promise<SafeResult<AuthSession>>;
}

export const authService: AuthServiceInterface = {
  verifyPasscode: (passcode) => instance.safeCall(E.API_VERIFY_PASSCODE, { body: { passcode } }),
  login: (username, passcode) =>
    instance.safeCall<AuthSession>(E.API_LOGIN, { body: { username, passcode } }),
  signup: (username, displayName, passcode) =>
    instance.safeCall<AuthSession>(E.API_SIGNUP, { body: { username, displayName, passcode } }),
};
