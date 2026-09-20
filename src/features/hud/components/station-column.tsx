// Left gutter — STATION: where and when you are.
//
// The human half of the HUD. It answers three ambient questions you would
// otherwise switch apps for: what time is it, what is it like outside, and how
// much daylight is left. Nothing here is actionable and nothing here is a Life OS
// metric — those belong on the stage.

import { useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { ambientActions, useAmbientStore } from '@/store/ambient-store'
import { HudBar, HudBlock, HudDot, HudRow, type HudTone } from './hud-primitives'
import type { HudDensity } from '../use-gutter-space'
import { describeAqi, describeUv, describeWeatherCode } from '../wmo-codes'
import {
  displayTimeZone,
  formatAgo,
  formatClock,
  formatCoords,
  formatDayStamp,
  formatDuration,
  formatTemperature,
  localTimeZone,
  progressBetween,
  timeZoneCity,
} from '../hud-format'

/** Refresh cadence for the ambient snapshot; the store still enforces its own TTL. */
const AMBIENT_POLL_MS = 5 * 60_000

function LocationGate() {
  const gate = useAmbientStore.use.gate()

  if (gate === 'denied' || gate === 'unavailable') {
    return (
      <HudBlock label="Outside">
        <p className="hud-note">
          Location is {gate === 'denied' ? 'blocked' : 'unavailable'}. Weather and air quality stay off until the
          browser allows a fix for this site.
        </p>
      </HudBlock>
    )
  }

  return (
    <HudBlock label="Outside">
      <p className="hud-note">Weather, air quality and daylight need one location fix. It is cached after that.</p>
      <button
        type="button"
        className="hud-action"
        onClick={() => void ambientActions.enableLocation()}
        disabled={gate === 'prompting'}
      >
        <MapPin size={11} strokeWidth={2.2} aria-hidden="true" />
        {gate === 'prompting' ? 'Waiting…' : 'Use my location'}
      </button>
    </HudBlock>
  )
}

function StationColumn({ now, density }: { now: Date; density: HudDensity }) {
  const coords = useAmbientStore.use.coords()
  const place = useAmbientStore.use.place()
  const snapshot = useAmbientStore.use.snapshot()
  const error = useAmbientStore.use.error()

  // Stale-while-revalidate: the store no-ops until its own TTL has passed, so
  // this interval is a ceiling on staleness rather than a request every 5 minutes.
  useEffect(() => {
    void ambientActions.ensureFresh()
    const timer = window.setInterval(() => {
      if (!document.hidden) void ambientActions.ensureFresh()
    }, AMBIENT_POLL_MS)
    return () => window.clearInterval(timer)
  }, [])

  const zone = localTimeZone()
  const weather = snapshot?.weather
  const air = snapshot?.air
  const condition = weather ? describeWeatherCode(weather.weatherCode, weather.isDay) : undefined
  const aqi = describeAqi(air?.usAqi)
  const uv = weather ? describeUv(weather.uvIndexMax) : undefined

  const daylight = weather ? progressBetween(weather.sunriseAt, weather.sunsetAt, now.getTime()) : 0
  const beforeSunrise = weather ? now.getTime() < weather.sunriseAt : false
  const lightLeftSeconds = weather ? Math.max(0, (weather.sunsetAt - now.getTime()) / 1000) : 0

  return (
    <div className="hud-column hud-column--station">
      <div className="hud-clock">
        <span className="hud-clock-time">{formatClock(now)}</span>
        <span className="hud-clock-meta">
          {formatDayStamp(now)} · {timeZoneCity(zone)}
        </span>
      </div>

      {density === 'full' && (
        <HudBlock label="Clocks">
          <HudRow label="Local" value={formatClock(now, undefined, false)} />
          <HudRow label="UTC" value={formatClock(now, 'UTC', false)} />
          <HudRow label="Zone" value={displayTimeZone(zone)} />
        </HudBlock>
      )}

      {!coords && <LocationGate />}

      {coords && weather && condition && (
        <>
          <HudBlock label="Outside" meta={condition.label}>
            <div className="hud-hero">
              <span className="hud-hero-value">{formatTemperature(weather.temperatureC)}</span>
              <span className="hud-hero-glyph" aria-hidden="true">
                {condition.glyph}
              </span>
            </div>
            <HudRow label="Feels" value={formatTemperature(weather.feelsLikeC)} />
            <HudRow
              label="Range"
              value={`${formatTemperature(weather.lowC)} — ${formatTemperature(weather.highC)}`}
            />
            <HudRow label="Humidity" value={`${Math.round(weather.humidityPct)}%`} />
            <HudRow label="Wind" value={`${Math.round(weather.windKph)} km/h`} />
            {uv && <HudRow label="UV max" value={`${weather.uvIndexMax.toFixed(1)} ${uv.band}`} tone={uv.tone} />}
          </HudBlock>

          {density !== 'minimal' && (
            <HudBlock label="Air" meta={aqi?.band}>
              <div className="hud-hero">
                <span className="hud-hero-value">{air?.usAqi ?? '—'}</span>
                <span className="hud-hero-unit">US AQI</span>
              </div>
              <HudRow
                label="PM2.5"
                value={air?.pm25 === null || air?.pm25 === undefined ? '—' : `${air.pm25.toFixed(1)} µg`}
                tone={aqi?.tone ?? 'idle'}
              />
              <HudRow
                label="PM10"
                value={air?.pm10 === null || air?.pm10 === undefined ? '—' : `${air.pm10.toFixed(1)} µg`}
              />
            </HudBlock>
          )}

          <HudBlock label="Daylight">
            <HudBar ratio={daylight} tone={(daylight > 0 && daylight < 1 ? 'good' : 'idle') as HudTone} />
            <HudRow label="Sunrise" value={formatClock(new Date(weather.sunriseAt), undefined, false)} />
            <HudRow label="Sunset" value={formatClock(new Date(weather.sunsetAt), undefined, false)} />
            <HudRow
              label={beforeSunrise ? 'Until light' : 'Light left'}
              value={
                beforeSunrise
                  ? formatDuration((weather.sunriseAt - now.getTime()) / 1000)
                  : formatDuration(lightLeftSeconds)
              }
            />
          </HudBlock>
        </>
      )}

      {coords && (
        <div className="hud-footer">
          <HudDot tone={error ? 'watch' : 'good'} />
          <span className="hud-footer-text">
            {place?.label ?? formatCoords(coords.latitude, coords.longitude)}
            {' · '}
            {error ? error : formatAgo(snapshot?.fetchedAt)}
          </span>
        </div>
      )}
    </div>
  )
}

export { StationColumn }
