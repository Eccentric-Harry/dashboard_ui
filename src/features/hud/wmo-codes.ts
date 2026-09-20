// WMO 4677 weather interpretation codes → a short label and a glyph.
// Open-Meteo returns the raw code; the mapping is presentation, so it lives with
// the HUD rather than in the service. Labels are kept to ~11 characters: the
// column is 200–300px wide and this line sits next to the temperature.

export interface WeatherDescription {
  label: string;
  glyph: string;
}

const CODES: Record<number, WeatherDescription> = {
  0: { label: 'Clear', glyph: '○' },
  1: { label: 'Mostly clear', glyph: '◔' },
  2: { label: 'Part cloudy', glyph: '◑' },
  3: { label: 'Overcast', glyph: '●' },
  45: { label: 'Fog', glyph: '≡' },
  48: { label: 'Rime fog', glyph: '≡' },
  51: { label: 'Light drizzle', glyph: '⋯' },
  53: { label: 'Drizzle', glyph: '⋯' },
  55: { label: 'Heavy drizzle', glyph: '⋯' },
  56: { label: 'Icy drizzle', glyph: '⋯' },
  57: { label: 'Icy drizzle', glyph: '⋯' },
  61: { label: 'Light rain', glyph: '⋮' },
  63: { label: 'Rain', glyph: '⋮' },
  65: { label: 'Heavy rain', glyph: '⋮' },
  66: { label: 'Freezing rain', glyph: '⋮' },
  67: { label: 'Freezing rain', glyph: '⋮' },
  71: { label: 'Light snow', glyph: '✳' },
  73: { label: 'Snow', glyph: '✳' },
  75: { label: 'Heavy snow', glyph: '✳' },
  77: { label: 'Snow grains', glyph: '✳' },
  80: { label: 'Showers', glyph: '⋮' },
  81: { label: 'Showers', glyph: '⋮' },
  82: { label: 'Heavy showers', glyph: '⋮' },
  85: { label: 'Snow showers', glyph: '✳' },
  86: { label: 'Snow showers', glyph: '✳' },
  95: { label: 'Thunderstorm', glyph: '⚡' },
  96: { label: 'Storm + hail', glyph: '⚡' },
  99: { label: 'Storm + hail', glyph: '⚡' },
};

export function describeWeatherCode(code: number, isDay: boolean): WeatherDescription {
  const description = CODES[code];
  if (!description) return { label: 'Unknown', glyph: '·' };
  // Only the clear/near-clear codes change character after dark.
  if (!isDay && (code === 0 || code === 1)) return { ...description, glyph: '☾' };
  return description;
}

/**
 * US AQI bands (EPA). `tone` maps to the route palette's three semantic colours —
 * sage for fine, amber for watch, rose for act — never a neon traffic light.
 */
export function describeAqi(usAqi: number | null | undefined): { band: string; tone: 'good' | 'watch' | 'bad' } | undefined {
  if (usAqi === null || usAqi === undefined) return undefined;
  if (usAqi <= 50) return { band: 'Good', tone: 'good' };
  if (usAqi <= 100) return { band: 'Moderate', tone: 'watch' };
  if (usAqi <= 150) return { band: 'Sensitive', tone: 'watch' };
  if (usAqi <= 200) return { band: 'Unhealthy', tone: 'bad' };
  if (usAqi <= 300) return { band: 'Very bad', tone: 'bad' };
  return { band: 'Hazardous', tone: 'bad' };
}

export function describeUv(uv: number): { band: string; tone: 'good' | 'watch' | 'bad' } {
  if (uv < 3) return { band: 'Low', tone: 'good' };
  if (uv < 6) return { band: 'Moderate', tone: 'watch' };
  if (uv < 8) return { band: 'High', tone: 'watch' };
  return { band: 'Very high', tone: 'bad' };
}
