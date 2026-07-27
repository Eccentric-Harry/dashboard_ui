// Auth domain types.

export interface AuthSession {
  token: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}
