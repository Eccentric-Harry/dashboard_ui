// Right gutter — TELEMETRY: how the machine and the app are doing.
//
// Everything here is measured, never simulated. Where a browser will not tell us
// something (heap outside Chromium, battery on Safari/Firefox, storage on older
// Safari) the row shows a dash rather than a plausible number — a HUD that
// invents readings is worse than no HUD.

import { CONFIG } from '@/services/api-config'
import { isGuestSession } from '@/services/http/session'
import { percentileLatency } from '@/services/http/request-telemetry'
import type { AppPath } from '@/app/routes'
import { HudBar, HudDot, HudPanel, HudRow, HudSpark, type HudTone } from './hud-primitives'
import { useBackendPulse, type PulseState } from '../use-backend-pulse'
import type { HudDensity } from '../use-gutter-space'
import { useActiveRequestCount, useRequestSamples } from '../use-request-samples'
import {
  readDeviceFacts,
  readNavigationTiming,
  useBattery,
  useFps,
  useMemory,
  useNetwork,
  useStorageEstimate,
  useUptimeSeconds,
  useViewport,
} from '../use-runtime-vitals'
import { formatBytes, formatCompactMs, formatDuration, formatMs } from '../hud-format'

const deviceFacts = readDeviceFacts()
const navigationTiming = readNavigationTiming()
const apiHost = (() => {
  try {
    return new URL(CONFIG.BACKEND_API_BASE_URL, window.location.origin).host
  } catch {
    return 'unknown'
  }
})()

const PULSE_TONE: Record<PulseState, HudTone> = { up: 'good', slow: 'watch', down: 'bad', unknown: 'idle' }
const PULSE_LABEL: Record<PulseState, string> = { up: 'reachable', slow: 'slow', down: 'unreachable', unknown: 'idle' }

/**
 * A grid cell is only worth its space if it has a reading. Half of what this
 * panel can show is Chromium-only, and on Safari the omitted ones used to print
 * '—' — four dashes in a row reads as a broken card, not as a browser limit.
 */
function MetricCells({ cells }: { cells: { label: string; value: string; tone?: HudTone }[] }) {
  const present = cells.filter((cell) => cell.value)
  if (present.length === 0) return null
  return (
    <div className="hud-metric-grid">
      {present.map((cell) => (
        <span key={cell.label} className="hud-metric">
          <span className="hud-metric-label">{cell.label}</span>
          <span className={`hud-metric-value${cell.tone ? ` hud-tone-${cell.tone}` : ''}`}>{cell.value}</span>
        </span>
      ))}
    </div>
  )
}

/** Frame budget: 55+ is smooth, under 30 is visibly dropping. */
function fpsTone(fps: number | undefined): HudTone {
  if (fps === undefined) return 'idle'
  if (fps >= 50) return 'good'
  if (fps >= 30) return 'watch'
  return 'bad'
}

function statusTone(status: number): HudTone {
  if (status === 0 || status >= 500) return 'bad'
  if (status >= 400) return 'watch'
  return 'good'
}

function ratioTone(ratio: number): HudTone {
  return ratio > 0.8 ? 'bad' : ratio > 0.6 ? 'watch' : 'good'
}

function TelemetryColumn({
  activePath,
  density,
  narrow,
}: {
  activePath: AppPath
  density: HudDensity
  narrow: boolean
}) {
  const uptimeSeconds = useUptimeSeconds()
  const fps = useFps(true)
  const memory = useMemory(true)
  const network = useNetwork()
  const battery = useBattery()
  const viewport = useViewport()
  const storage = useStorageEstimate()
  const samples = useRequestSamples()
  const pulse = useBackendPulse(true, samples)
  const inFlight = useActiveRequestCount()

  const guest = isGuestSession()
  // Guest traffic is answered by the local mock adapter, so its "latency" is the
  // cost of a JSON clone — showing it as API latency would be a lie.
  const latencySamples = guest ? [] : samples.filter((sample) => !sample.guest)
  const recent = latencySamples.slice(-20)
  const p50 = percentileLatency(recent, 0.5)
  const p95 = percentileLatency(recent, 0.95)
  const failures = recent.filter((sample) => sample.status === 0 || sample.status >= 400).length
  // The stream panel is the one that grows, so it is handed more rows than will
  // fit and lets its own height decide; the list fades out where it runs out.
  const stream = samples.slice(-14).reverse()

  return (
    <div className="hud-column hud-column--telemetry is-filled">
      <HudPanel label="Session" meta={import.meta.env.MODE} className="hud-panel--clock">
        <span className="hud-clock-time hud-clock-time--small">{formatDuration(uptimeSeconds)}</span>
        <div className="hud-clock-rows">
          <HudRow label="Route" value={activePath} />
          <HudRow label="Requests" value={samples.length ? `${samples[samples.length - 1].id}` : '0'} />
          {/* Lives here rather than in the Link panel, which does not render at
              all on a browser with no Network Information API. */}
          <HudRow
            label="Network"
            value={network.online ? 'online' : 'offline'}
            tone={network.online ? 'idle' : 'bad'}
          />
        </div>
      </HudPanel>

      <HudPanel label="Runtime" meta={fps.current === undefined ? undefined : `${fps.current} fps`}>
        <div className="hud-spark-row">
          <HudSpark values={fps.history} tone={fpsTone(fps.current)} minRange={12} height={22} />
        </div>
        {memory && (
          <>
            <HudRow label="JS heap" value={`${memory.usedMb.toFixed(0)} / ${memory.limitMb.toFixed(0)} MB`} />
            <HudBar ratio={memory.ratio} tone={ratioTone(memory.ratio)} />
          </>
        )}
        {storage && (
          <>
            <HudRow label="Storage" value={`${formatBytes(storage.usageBytes)} / ${formatBytes(storage.quotaBytes)}`} />
            <HudBar ratio={storage.ratio} tone={ratioTone(storage.ratio)} />
          </>
        )}
        <MetricCells
          cells={[
            // Navigation Timing is the only part of this panel every browser
            // answers, so it leads.
            { label: 'TTFB', value: navigationTiming ? formatMs(navigationTiming.ttfbMs) : '' },
            { label: 'DOM ready', value: navigationTiming ? formatMs(navigationTiming.domReadyMs) : '' },
            { label: 'Cores', value: deviceFacts.cores ? `${deviceFacts.cores}×` : '' },
            { label: 'Memory', value: deviceFacts.memoryGb ? `${deviceFacts.memoryGb} GB` : '' },
            { label: 'Viewport', value: `${viewport.width}×${viewport.height}` },
            { label: 'Zoom · DPR', value: `${viewport.zoom.toFixed(2)} · ${deviceFacts.pixelRatio}×` },
          ]}
        />
      </HudPanel>

      {density === 'full' && (network.hasDetails || battery) && (
        <HudPanel label="Link" meta={network.effectiveType ?? undefined}>
          {network.rttMs !== undefined && <HudRow label="RTT" value={`${network.rttMs}ms`} />}
          {!narrow && network.downlinkMbps !== undefined && (
            <HudRow label="Downlink" value={`${network.downlinkMbps.toFixed(1)} Mb/s`} />
          )}
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
        </HudPanel>
      )}

      <HudPanel label="API" meta={guest ? 'guest' : apiHost}>
        {guest ? (
          <p className="hud-note">Guest session — every request is answered locally, so there is no latency to read.</p>
        ) : (
          <>
            <div className="hud-spark-row">
              <HudSpark
                values={recent.map((sample) => sample.durationMs)}
                tone={p50 !== undefined && p50 > 600 ? 'watch' : 'good'}
                minRange={40}
                height={22}
              />
            </div>
            <MetricCells
              cells={[
                { label: 'p50', value: formatMs(p50) },
                { label: 'p95', value: formatMs(p95) },
                { label: 'In flight', value: inFlight === 0 ? 'idle' : `${inFlight}` },
                {
                  label: 'Errors',
                  value: `${failures} / ${recent.length}`,
                  tone: failures > 0 ? 'bad' : 'good',
                },
              ]}
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
      </HudPanel>

      <HudPanel label="Stream" meta={stream.length === 0 ? 'quiet' : undefined} grow>
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
                <span className="hud-stream-ms">
                    {sample.guest ? 'mock' : formatCompactMs(sample.durationMs)}
                  </span>
              </li>
            ))}
          </ul>
        )}
      </HudPanel>
    </div>
  )
}

export { TelemetryColumn }
