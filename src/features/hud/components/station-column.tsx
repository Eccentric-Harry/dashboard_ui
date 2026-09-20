// Left gutter — STATION: where and when you are.
//
// The human half of the HUD, as a bento column of small cards: clock, what it is
// like outside (with the next twelve hours), the air, and the light left in the
// day. Nothing here is actionable and nothing here is a Life OS metric — those
// belong on the stage.

import { useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { ambientActions, useAmbientStore } from '@/store/ambient-store'
import { HudBar, HudHourly, HudPanel, HudRow, HudScale, type HudTone } from './hud-primitives'
import { describeAqi, describeUv, describeWeatherCode } from '../wmo-codes'
import { moonPhaseAt } from '../moon'
import type { HudDensity } from '../use-gutter-space'
import {
  displayTimeZone,
  formatAgo,
  formatClock,
  formatCoords,
  formatDayStamp,
  formatDuration,
  formatHourLabel,
  formatTemperature,
  formatWeekday,
  localTimeZone,
  progressBetween,
  timeZoneCity,
} from '../hud-format'

/** Refresh cadence for the ambient snapshot; the store still enforces its own TTL. */
const AMBIENT_POLL_MS = 5 * 60_000
/** US AQI is open-ended; 200 ("unhealthy") is the top of the scale worth drawing. */
const AQI_SCALE_TOP = 200

function LocationGate() {
  const gate = useAmbientStore.use.gate()

  if (gate === 'denied' || gate === 'unavailable') {
    return (
      <HudPanel label="Outside">
        <p className="hud-note">
          Location is {gate === 'denied' ? 'blocked' : 'unavailable'}. Weather, air quality and daylight stay off
          until the browser allows a fix for this site.
        </p>
      </HudPanel>
    )
  }

  return (
    <HudPanel label="Outside">
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
    </HudPanel>
  )
}

function StationColumn({ now, density, narrow }: { now: Date; density: HudDensity; narrow: boolean }) {
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
  const hourly = snapshot?.hourly
  const condition = weather ? describeWeatherCode(weather.weatherCode, weather.isDay) : undefined
  const aqi = describeAqi(air?.usAqi)
  const uv = weather ? describeUv(weather.uvIndexMax) : undefined
  const moon = moonPhaseAt(now)

  const daylight = weather ? progressBetween(weather.sunriseAt, weather.sunsetAt, now.getTime()) : 0
  const beforeSunrise = weather ? now.getTime() < weather.sunriseAt : false
  const lightLeftSeconds = weather ? Math.max(0, (weather.sunsetAt - now.getTime()) / 1000) : 0
  // Only at full density: squeezed into a short column the plot collapses to a
  // sliver that reads as a rendering fault rather than a chart. Dropping it also
  // leaves the stack with no growing panel, which is fine — four panels sharing
  // the slack fill a short column on their own.
  const hasForecast = Boolean(hourly && hourly.temperatureC.length >= 2 && density === 'full')
  const outlook = (snapshot?.outlook ?? []).slice(0, 3)

  return (
    <div className={`hud-column hud-column--station${weather ? ' is-filled' : ''}`}>
      <HudPanel label={formatDayStamp(now)} meta={timeZoneCity(zone)} className="hud-panel--clock">
        <span className="hud-clock-time">{formatClock(now)}</span>
        <div className="hud-clock-rows">
          <HudRow label="UTC" value={formatClock(now, 'UTC', false)} />
          {!narrow && <HudRow label="Zone" value={displayTimeZone(zone)} />}
        </div>
      </HudPanel>

      {!coords && <LocationGate />}

      {coords && weather && condition && (
        <>
          {/* The panel that grows: the forecast plot stretches into whatever height
              the rest of the stack leaves, so the column has no dead air at the
              bottom of a tall window. */}
          <HudPanel label="Outside" meta={condition.label} grow={hasForecast}>
            <div className="hud-hero">
              <span className="hud-hero-value">{formatTemperature(weather.temperatureC)}</span>
              <span className="hud-hero-glyph" aria-hidden="true">
                {condition.glyph}
              </span>
              <span className="hud-hero-aside">
                feels {formatTemperature(weather.feelsLikeC)}
              </span>
            </div>

            <div className="hud-metric-grid">
              <span className="hud-metric">
                <span className="hud-metric-label">Humidity</span>
                <span className="hud-metric-value">{Math.round(weather.humidityPct)}%</span>
              </span>
              <span className="hud-metric">
                <span className="hud-metric-label">Wind</span>
                <span className="hud-metric-value">{Math.round(weather.windKph)} km/h</span>
              </span>
              <span className="hud-metric">
                <span className="hud-metric-label">Low</span>
                <span className="hud-metric-value">{formatTemperature(weather.lowC)}</span>
              </span>
              <span className="hud-metric">
                <span className="hud-metric-label">High</span>
                <span className="hud-metric-value">{formatTemperature(weather.highC)}</span>
              </span>
            </div>

            {uv && (
              <HudRow
                label="UV index"
                value={narrow ? uv.band : `${weather.uvIndexMax.toFixed(1)} · ${uv.band}`}
                tone={uv.tone}
              />
            )}

            {hasForecast && hourly && (
              <HudHourly
                times={hourly.times}
                temperatures={hourly.temperatureC}
                precipitation={hourly.precipitationChance}
                formatHour={formatHourLabel}
              />
            )}
          </HudPanel>

          {density !== 'minimal' && (
            <HudPanel label="Air" meta={aqi?.band}>
              <div className="hud-hero">
                <span className="hud-hero-value">{air?.usAqi ?? '—'}</span>
                <span className="hud-hero-unit">US AQI</span>
              </div>
              <HudScale ratio={(air?.usAqi ?? 0) / AQI_SCALE_TOP} tone={aqi?.tone ?? 'idle'} />
              <div className="hud-metric-grid">
                <span className="hud-metric">
                  <span className="hud-metric-label">PM2.5</span>
                  <span className="hud-metric-value">
                    {air?.pm25 === null || air?.pm25 === undefined ? '—' : `${air.pm25.toFixed(1)}`}
                  </span>
                </span>
                <span className="hud-metric">
                  <span className="hud-metric-label">PM10</span>
                  <span className="hud-metric-value">
                    {air?.pm10 === null || air?.pm10 === undefined ? '—' : `${air.pm10.toFixed(1)}`}
                  </span>
                </span>
              </div>
            </HudPanel>
          )}

          {density === 'full' && outlook.length > 0 && (
            <HudPanel label="Next days">
              <ul className="hud-outlook">
                {outlook.map((day) => {
                  const dayCondition = describeWeatherCode(day.weatherCode, true)
                  return (
                    <li key={day.at} className="hud-outlook-row">
                      <span className="hud-outlook-day">{formatWeekday(day.at)}</span>
                      <span className="hud-outlook-glyph" title={dayCondition.label} aria-hidden="true">
                        {dayCondition.glyph}
                      </span>
                      <span className="hud-outlook-rain">
                        {day.precipitationChance > 5 ? `${Math.round(day.precipitationChance)}%` : ''}
                      </span>
                      <span className="hud-outlook-range">
                        <span className="hud-outlook-low">{formatTemperature(day.lowC)}</span>
                        <span className="hud-outlook-high">{formatTemperature(day.highC)}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </HudPanel>
          )}

          <HudPanel
            label="Daylight"
            meta={beforeSunrise ? 'before sunrise' : daylight >= 1 ? 'after dark' : undefined}
          >
            <div className="hud-hero">
              <span className="hud-hero-value hud-hero-value--sm">
                {beforeSunrise
                  ? formatDuration((weather.sunriseAt - now.getTime()) / 1000)
                  : formatDuration(lightLeftSeconds)}
              </span>
              <span className="hud-hero-unit">{beforeSunrise ? 'until light' : 'of light left'}</span>
            </div>
            <HudBar ratio={daylight} tone={(daylight > 0 && daylight < 1 ? 'good' : 'idle') as HudTone} />
            <div className="hud-metric-grid">
              <span className="hud-metric">
                <span className="hud-metric-label">Sunrise</span>
                <span className="hud-metric-value">{formatClock(new Date(weather.sunriseAt), undefined, false)}</span>
              </span>
              <span className="hud-metric">
                <span className="hud-metric-label">Sunset</span>
                <span className="hud-metric-value">{formatClock(new Date(weather.sunsetAt), undefined, false)}</span>
              </span>
            </div>
            {density === 'full' && (
              <HudRow
                label={`Moon ${moon.glyph}`}
                value={narrow ? `${Math.round(moon.illumination * 100)}%` : `${moon.label} · ${Math.round(moon.illumination * 100)}%`}
              />
            )}
          </HudPanel>
        </>
      )}

      {coords && (
        <div className="hud-column-foot">
          <MapPin size={10} strokeWidth={2.4} aria-hidden="true" />
          <span className="hud-column-foot-text">
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
