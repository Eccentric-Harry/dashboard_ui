// Declarative Workouts endpoint descriptors, ported 1:1 from the URLs in lib/api.ts.
import type { ApiEndpoint } from '../api-config';

export const API_GET_WORKOUTS: ApiEndpoint = { url: '/workouts', method: 'get' };
export const API_GET_STRAVA_ACTIVITIES: ApiEndpoint = { url: '/workouts/activities', method: 'get' };
export const API_GET_STRAVA_STATS: ApiEndpoint = { url: '/workouts/activities/stats', method: 'get' };
export const API_CREATE_STRAVA_ACTIVITY: ApiEndpoint = { url: '/workouts/activities', method: 'post' };
export const API_IMPORT_STRAVA_JSON: ApiEndpoint = { url: '/workouts/import/strava', method: 'post' };
export const API_GET_FEATURED_EMBED: ApiEndpoint = { url: '/workouts/featured-embed', method: 'get' };
export const API_UPDATE_FEATURED_EMBED: ApiEndpoint = { url: '/workouts/featured-embed', method: 'post' };
