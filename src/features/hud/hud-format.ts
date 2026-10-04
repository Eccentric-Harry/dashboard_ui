// Formatting for the HUD's readouts.

export function formatTemperature(celsius: number | undefined): string {
  return celsius === undefined || Number.isNaN(celsius) ? '—' : `${Math.round(celsius)}°`;
}

/**
 * IANA zones keep their historical spellings forever, and browsers still resolve
 * India to 'Asia/Calcutta'. Show the name the city actually goes by.
 */
const ZONE_CITY_ALIASES: Record<string, string> = {
  Calcutta: 'Kolkata',
  Saigon: 'Ho Chi Minh',
  Katmandu: 'Kathmandu',
};

/** The city half of an IANA zone ('Asia/Kolkata' → 'Kolkata'). */
export function timeZoneCity(timeZone: string | undefined): string {
  if (!timeZone) return '—';
  const city = (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
  return ZONE_CITY_ALIASES[city] ?? city;
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
