// Ambient environment reads: weather, air quality and reverse geocoding.
//
// These are the only calls in the app that deliberately bypass
// services/http/axios-client.ts, for two reasons that are not style choices:
//   1. the Axios request interceptor attaches the Life OS bearer token to every
//      request it handles — sending it to a third-party host would leak the
//      session;
//   2. the guest adapter answers *every* non-auth request locally, so a guest
//      would get a 404 from the mock router instead of real weather.
// So they use `fetch` directly, with the same discipline the Axios layer applies:
// a timeout, no throwing, and a typed result. Nothing else in the app may.
//
// Provider: Open-Meteo (open data, no API key, CORS-enabled, non-commercial use
// free). Reverse geocoding: OSM Nominatim, called at most once per rounded
// coordinate thanks to the caller's cache — its usage policy rules out polling.

import type { AmbientAir, AmbientCoords, AmbientPlace, AmbientSnapshot, AmbientWeather } from '@/types/ambient';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse';
const TIMEOUT_MS = 12_000;

export interface ExternalResult<T> {
  data: T | undefined;
  error: string | undefined;
}

const ok = <T>(data: T): ExternalResult<T> => ({ data, error: undefined });
const fail = <T>(error: string): ExternalResult<T> => ({ data: undefined, error });

/** Never throws. Returns parsed JSON or a message; aborts rather than hanging. */
async function getJson<T>(url: string): Promise<ExternalResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return fail(`HTTP ${response.status}`);
    return ok((await response.json()) as T);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return fail('timed out');
    return fail(navigator.onLine ? 'request failed' : 'offline');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Open-Meteo answers in the location's own wall-clock time ('2026-09-20T06:04')
 * plus a UTC offset in seconds. Parsing that string on a device in another zone
 * would silently shift it, so fold the offset in and keep epoch ms from here on.
 */
function toEpochMs(localIso: string | undefined, utcOffsetSeconds: number): number {
  if (!localIso) return Number.NaN;
  const asUtc = Date.parse(`${localIso}${localIso.length === 16 ? ':00' : ''}Z`);
  return Number.isNaN(asUtc) ? Number.NaN : asUtc - utcOffsetSeconds * 1000;
}

interface ForecastResponse {
  utc_offset_seconds: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
  };
  daily: {
    sunrise: string[];
    sunset: string[];
    uv_index_max: (number | null)[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

interface AirResponse {
  utc_offset_seconds: number;
  current: {
    time: string;
    pm2_5: number | null;
    pm10: number | null;
    us_aqi: number | null;
    european_aqi: number | null;
  };
}

interface NominatimResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    county?: string;
    state?: string;
    country_code?: string;
  };
}

const CURRENT_FIELDS = 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m';
const DAILY_FIELDS = 'sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min';

/**
 * One snapshot of the world at these coordinates. Weather and air quality are two
 * hosts, so they go out together and the air half degrades on its own: a missing
 * AQI leaves the temperature on screen rather than blanking the whole column.
 */
export async function fetchAmbientSnapshot({ latitude, longitude }: AmbientCoords): Promise<ExternalResult<AmbientSnapshot>> {
  const lat = latitude.toFixed(4);
  const lon = longitude.toFixed(4);

  const [forecast, air] = await Promise.all([
    getJson<ForecastResponse>(
      `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&current=${CURRENT_FIELDS}&daily=${DAILY_FIELDS}&timezone=auto&forecast_days=1`,
    ),
    getJson<AirResponse>(`${AIR_URL}?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,us_aqi,european_aqi&timezone=auto`),
  ]);

  if (!forecast.data) return fail(forecast.error ?? 'weather unavailable');

  const { current, daily, utc_offset_seconds: offset, timezone } = forecast.data;
  const weather: AmbientWeather = {
    temperatureC: current.temperature_2m,
    feelsLikeC: current.apparent_temperature,
    humidityPct: current.relative_humidity_2m,
    windKph: current.wind_speed_10m,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
    highC: daily.temperature_2m_max?.[0] ?? current.temperature_2m,
    lowC: daily.temperature_2m_min?.[0] ?? current.temperature_2m,
    uvIndexMax: daily.uv_index_max?.[0] ?? 0,
    timezone,
    sunriseAt: toEpochMs(daily.sunrise?.[0], offset),
    sunsetAt: toEpochMs(daily.sunset?.[0], offset),
    observedAt: toEpochMs(current.time, offset),
  };

  const airCurrent = air.data?.current;
  const airQuality: AmbientAir = {
    usAqi: airCurrent?.us_aqi ?? null,
    europeanAqi: airCurrent?.european_aqi ?? null,
    pm25: airCurrent?.pm2_5 ?? null,
    pm10: airCurrent?.pm10 ?? null,
    observedAt: airCurrent ? toEpochMs(airCurrent.time, air.data?.utc_offset_seconds ?? offset) : Number.NaN,
  };

  return ok({ weather, air: airQuality, fetchedAt: Date.now() });
}

/** Best-effort place name. Undefined is a normal outcome — the HUD shows coordinates. */
export async function reverseGeocode({ latitude, longitude }: AmbientCoords): Promise<AmbientPlace | undefined> {
  const result = await getJson<NominatimResponse>(
    `${GEOCODE_URL}?format=jsonv2&lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}&zoom=10&addressdetails=1`,
  );
  const address = result.data?.address;
  if (!address) return undefined;

  const label = address.city || address.town || address.village || address.suburb || address.county || address.state;
  if (!label) return undefined;

  return { label, region: address.state, countryCode: address.country_code?.toUpperCase() };
}

/**
 * Asks the browser for a fix. Called only from a user gesture — the HUD never
 * prompts for location on its own, so a dashboard left open on a second monitor
 * can't pop a permission dialog at nobody.
 */
export function requestDeviceCoords(): Promise<ExternalResult<AmbientCoords>> {
  if (!('geolocation' in navigator)) {
    return Promise.resolve(fail<AmbientCoords>('no geolocation'));
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve(
          ok({
            latitude: coords.latitude,
            longitude: coords.longitude,
            source: 'device' as const,
            fixedAt: Date.now(),
          }),
        ),
      (error) => resolve(fail<AmbientCoords>(error.code === error.PERMISSION_DENIED ? 'denied' : 'no fix')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30 * 60_000 },
    );
  });
}
