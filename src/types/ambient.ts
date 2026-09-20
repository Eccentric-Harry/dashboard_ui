// Ambient environment — the world outside the window (weather, air, daylight).
// Third-party data, not Life OS data: it never touches the ApiEnvelope, a userId
// or MongoDB. See services/external/open-meteo-service.ts for why it bypasses
// the Axios client entirely.

/** A resolved position plus how we came by it — the HUD labels the difference. */
export interface AmbientCoords {
  latitude: number;
  longitude: number;
  /** 'device' = the browser's Geolocation API (user granted); 'manual' = typed in. */
  source: 'device' | 'manual';
  /** Epoch ms the fix was taken; a stale fix is still usable, just labelled. */
  fixedAt: number;
}

/** Reverse-geocoded label for a fix. Optional everywhere: the HUD falls back to coords. */
export interface AmbientPlace {
  label: string;
  region?: string;
  countryCode?: string;
}

export interface AmbientWeather {
  temperatureC: number;
  feelsLikeC: number;
  humidityPct: number;
  windKph: number;
  /** WMO weather interpretation code — mapped to a label by describeWeatherCode(). */
  weatherCode: number;
  isDay: boolean;
  highC: number;
  lowC: number;
  uvIndexMax: number;
  /** IANA zone Open-Meteo resolved for the coordinates. */
  timezone: string;
  /** Epoch ms. Open-Meteo answers in *local* wall-clock time plus a UTC offset;
      the service folds the two together so the HUD never has to guess a zone. */
  sunriseAt: number;
  sunsetAt: number;
  observedAt: number;
}

/** The next several hours, for the forecast strip. Optional: snapshots cached by
    a build that predates it still render, just without the strip. */
export interface AmbientHourly {
  /** Epoch ms per sample, hourly, from the current hour forward. */
  times: number[];
  temperatureC: number[];
  precipitationChance: number[];
}

/** The days after today, for the outlook panel. */
export interface AmbientOutlookDay {
  /** Epoch ms at local midnight of that day. */
  at: number;
  highC: number;
  lowC: number;
  weatherCode: number;
  precipitationChance: number;
}

export interface AmbientAir {
  usAqi: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  observedAt: number;
}

export interface AmbientSnapshot {
  weather: AmbientWeather;
  hourly?: AmbientHourly;
  outlook?: AmbientOutlookDay[];
  air: AmbientAir;
  /** Epoch ms this snapshot was fetched — drives the cache TTL and the "as of" label. */
  fetchedAt: number;
}

/** Why the HUD has no environment data yet — each renders a different affordance. */
export type AmbientGateReason =
  | 'idle'          // never asked; show the "enable location" prompt
  | 'prompting'     // waiting on the browser permission dialog
  | 'denied'        // user said no; show a muted, permanent opt-in hint
  | 'unavailable'   // no Geolocation API, or the fix failed
  | 'offline';      // no network; keep the last snapshot on screen if we have one
