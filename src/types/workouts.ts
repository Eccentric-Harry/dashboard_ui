// Workouts (Strava) domain types — single source of truth.

/** A Strava activity reference the embed iframe can render (token needed for private activities). */
export interface StravaEmbedRef {
  id: string;
  token?: string;
}

export interface StravaActivity {
  id: string;
  stravaEmbedId?: string;
  stravaToken?: string;
  date: string;
  activityName: string;
  sportType: string;
  distanceKm: number;
  movingTime: string;
  movingTimeMinutes: number;
  elevationGainMeters: number;
  paceMinPerKm?: number;
  source: string;
  startTime?: string;
  activityUrl?: string;
}

export interface StravaActivityStats {
  totalDistanceKm: number;
  totalActivities: number;
  totalMovingTimeMinutes: number;
  totalElevationMeters: number;
  best5kPaceMinPerKm: number | null;
  best5kPaceFormatted: string;
  countBySportType: Record<string, number>;
  distanceBySportType: Record<string, number>;
  currentStreakWeeks: number;
  recentEmbeds: StravaEmbedRef[];
}

// ── Request DTOs ──
export interface CreateStravaActivityRequest {
  activityName: string;
  sportType: string;
  distanceKm: number;
  movingTime: string;
  elevationGainMeters: number;
  date: string;
  stravaEmbedId?: string;
  stravaToken?: string;
}

export type FeaturedEmbedRequest = StravaEmbedRef;
