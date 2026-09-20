// Right gutter — TELEMETRY: how the machine and the app are doing.
//
// Everything here is measured, never simulated. Where a browser will not tell us
// something (heap outside Chromium, battery on Safari/Firefox) the row shows a
// dash rather than a plausible number — a HUD that invents readings is worse than
// no HUD.

import { CONFIG } from '@/services/api-config'
import { isGuestSession } from '@/services/http/session'
import { percentileLatency } from '@/services/http/request-telemetry'
import type { AppPath } from '@/app/routes'
import { HudBar, HudBlock, HudDot, HudRow, HudSpark, type HudTone } from './hud-primitives'
import { useBackendPulse, type PulseState } from '../use-backend-pulse'
import type { HudDensity } from '../use-gutter-space'
import { useActiveRequestCount, useRequestSamples } from '../use-request-samples'
import { readDeviceFacts, useBattery, useFps, useMemory, useNetwork, useUptimeSeconds } from '../use-runtime-vitals'
import { formatDuration, formatMs } from '../hud-format'

const deviceFacts = readDeviceFacts()
const apiHost = (() => {
  try {
    return new URL(CONFIG.BACKEND_API_BASE_URL, window.location.origin).host
  } catch {
    return 'unknown'
  }
})()

const PULSE_TONE: Record<PulseState, HudTone> = { up: 'good', slow: 'watch', down: 'bad', unknown: 'idle' }
const PULSE_LABEL: Record<PulseState, string> = { up: 'reachable', slow: 'slow', down: 'unreachable', unknown: 'checking' }

/** Frame budget: 55+ is smooth, under 30 is visibly dropping. */
function fpsTone(fps: number | undefined): HudTone {
  if (fps === undefined) return 'idle'
  if (fps >= 50) return 'good'
  if (fps >= 30) return 'watch'
  return 'bad'
}

function statusTone(status: number): HudTone {
  if (status === 0) return 'bad'
  if (status >= 500) return 'bad'
  if (status >= 400) return 'watch'
  return 'good'
}

function TelemetryColumn({ activePath, density }: { activePath: AppPath; density: HudDensity }) {
  const uptimeSeconds = useUptimeSeconds()
  const fps = useFps(true)
  const memory = useMemory(true)
  const network = useNetwork()
  const battery = useBattery()
  const pulse = useBackendPulse(true)
  const samples = useRequestSamples()
  const inFlight = useActiveRequestCount()

  const guest = isGuestSession()
  // Guest traffic is answered by the local mock adapter, so its "latency" is the
  // cost of a JSON clone — showing it as API latency would be a lie.
  const latencySamples = guest ? [] : samples.filter((sample) => !sample.guest)
  const recent = latencySamples.slice(-20)
  const p50 = percentileLatency(recent, 0.5)
  const p95 = percentileLatency(recent, 0.95)
  const failures = recent.filter((sample) => sample.status === 0 || sample.status >= 400).length
  const stream = samples.slice(-6).reverse()

  return (
    <div className="hud-column hud-column--telemetry">
      <div className="hud-clock">
        <span className="hud-clock-time hud-clock-time--small">{formatDuration(uptimeSeconds)}</span>
        <span className="hud-clock-meta">SESSION UPTIME · {import.meta.env.MODE.toUpperCase()}</span>
      </div>

      <HudBlock label="Runtime" meta={activePath}>
        <div className="hud-spark-row">
          <HudSpark values={fps.history} tone={fpsTone(fps.current)} minRange={12} />
          <span className={`hud-spark-value hud-tone-${fpsTone(fps.current)}`}>
            {fps.current === undefined ? '—' : `${fps.current} fps`}
          </span>
        </div>
        {memory ? (
          <>
            <HudRow label="JS heap" value={`${memory.usedMb.toFixed(0)} / ${memory.limitMb.toFixed(0)} MB`} />
            <HudBar ratio={memory.ratio} tone={memory.ratio > 0.8 ? 'bad' : memory.ratio > 0.6 ? 'watch' : 'good'} />
          </>
        ) : (
          <HudRow label="JS heap" value="not exposed" />
        )}
        <HudRow label="Cores" value={deviceFacts.cores ? `${deviceFacts.cores}×` : '—'} />
        <HudRow
          label="Device"
          value={`${deviceFacts.memoryGb ? `${deviceFacts.memoryGb} GB · ` : ''}${deviceFacts.pixelRatio}× DPR`}
        />
      </HudBlock>

      {density !== 'minimal' && (
        <HudBlock label="Link" meta={network.online ? undefined : 'offline'}>
          <HudRow
            label="Status"
            value={network.online ? 'online' : 'offline'}
            tone={network.online ? 'good' : 'bad'}
          />
          <HudRow label="Class" value={network.effectiveType ?? '—'} />
          <HudRow label="RTT" value={network.rttMs === undefined ? '—' : `${network.rttMs}ms`} />
          <HudRow
            label="Downlink"
            value={network.downlinkMbps === undefined ? '—' : `${network.downlinkMbps.toFixed(1)} Mb/s`}
          />
          {battery && (
            <>
              <HudRow
                label={battery.charging ? 'Battery ⚡' : 'Battery'}
                value={`${Math.round(battery.level * 100)}%`}
                tone={battery.level < 0.15 && !battery.charging ? 'bad' : 'idle'}
              />
              <HudBar ratio={battery.level} tone={battery.level < 0.15 && !battery.charging ? 'bad' : 'good'} />
            </>
          )}
        </HudBlock>
      )}

      <HudBlock label="API" meta={guest ? 'guest' : apiHost}>
        {guest ? (
          <p className="hud-note">Guest session — every request is answered locally, so there is no latency to read.</p>
        ) : (
          <>
            <div className="hud-spark-row">
              <HudSpark
                values={recent.map((sample) => sample.durationMs)}
                tone={p50 !== undefined && p50 > 600 ? 'watch' : 'good'}
                minRange={40}
              />
              <span className="hud-spark-value">{formatMs(p50)}</span>
            </div>
            <HudRow label="p50 / p95" value={`${formatMs(p50)} / ${formatMs(p95)}`} />
            <HudRow label="In flight" value={inFlight === 0 ? 'idle' : `${inFlight}`} tone={inFlight > 0 ? 'watch' : 'idle'} />
            <HudRow
              label="Errors"
              value={`${failures} / ${recent.length}`}
              tone={failures > 0 ? 'bad' : 'good'}
            />
            <div className="hud-row">
              <span className="hud-row-label">Backend</span>
              <span className="hud-row-leader" aria-hidden="true" />
              <span className={`hud-row-value hud-tone-${PULSE_TONE[pulse.state]}`}>
                <HudDot tone={PULSE_TONE[pulse.state]} pulsing={pulse.state === 'up'} />
                {pulse.rttMs === undefined ? PULSE_LABEL[pulse.state] : formatMs(pulse.rttMs)}
              </span>
            </div>
          </>
        )}
      </HudBlock>

      {density === 'full' && (
        <HudBlock label="Stream" meta={stream.length === 0 ? 'quiet' : undefined}>
          {stream.length === 0 ? (
            <p className="hud-note">No requests yet this session.</p>
          ) : (
            <ul className="hud-stream">
              {stream.map((sample) => (
                <li key={sample.id} className="hud-stream-line">
                  <span className="hud-stream-method">{sample.method}</span>
                  <span className="hud-stream-path" title={sample.path}>
                    {sample.path}
                  </span>
                  <span className={`hud-stream-status hud-tone-${statusTone(sample.status)}`}>
                    {sample.status || 'ERR'}
                  </span>
                  <span className="hud-stream-ms">{sample.guest ? 'mock' : sample.durationMs}</span>
                </li>
              ))}
            </ul>
          )}
        </HudBlock>
      )}
    </div>
  )
}

export { TelemetryColumn }
