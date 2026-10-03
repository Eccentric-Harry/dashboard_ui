import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Cloud, CloudOff, Loader2, LogOut, MoreHorizontal, Plus } from 'lucide-react'

import type { GoogleSyncStatus } from '@/types/calendar'
import { PopoverMenu } from './composer/popover-menu'

type Props = {
  status: GoogleSyncStatus | null
  pulling: string | null
  pushing: string | null
  disconnecting: string | null
  connecting: boolean
  onConnect: () => void
  onPull: (email: string) => void
  onPush: (email: string) => void
  onDisconnect: (email: string) => void
}

function syncedAgo(iso?: string) {
  if (!iso) return 'Not synced yet'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'Synced just now'
  if (mins < 60) return `Synced ${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `Synced ${hours}h ago`
  const days = Math.round(hours / 24)
  return days < 14 ? `Synced ${days}d ago` : `Synced ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

/** Google Calendar accounts as one quiet footer row each: who, how fresh, pull / push. */
export function GoogleSync({ status, pulling, pushing, disconnecting, connecting, onConnect, onPull, onPush, onDisconnect }: Props) {
  const [menu, setMenu] = useState<{ email: string; anchor: HTMLElement } | null>(null)
  const accounts = status?.accounts ?? []

  if (accounts.length === 0) {
    return (
      <section className="cv-sync">
        <button type="button" className="cv-sync-connect" onClick={onConnect} disabled={connecting} title="Two-way sync with your Google events">
          <span className="cv-sync-ic" aria-hidden="true">
            {connecting ? <Loader2 size={13} className="animate-spin" /> : <CloudOff size={13} strokeWidth={2.2} />}
          </span>
          <b>{connecting ? 'Connecting…' : 'Connect Google'}</b>
        </button>
      </section>
    )
  }

  return (
    <section className="cv-sync" aria-label="Google Calendar">
      {accounts.map((account) => {
        const busy = pulling === account.email || pushing === account.email
        return (
          <div key={account.email} className="cv-sync-row">
            <span className="cv-sync-ic" aria-hidden="true">
              <Cloud size={14} strokeWidth={2.2} />
            </span>
            <span className="cv-sync-text">
              <b title={account.email}>{account.email}</b>
              <small>{pulling === account.email ? 'Pulling…' : pushing === account.email ? 'Pushing…' : syncedAgo(account.lastSyncedAt)}</small>
            </span>
            <button
              type="button"
              className="cv-icon-btn is-sm"
              disabled={busy}
              onClick={() => onPull(account.email)}
              title="Pull the latest from Google"
              aria-label="Pull from Google"
            >
              {pulling === account.email ? <Loader2 size={13} className="animate-spin" /> : <ArrowDownToLine size={13} strokeWidth={2.2} />}
            </button>
            <button
              type="button"
              className="cv-icon-btn is-sm"
              disabled={busy}
              onClick={() => onPush(account.email)}
              title="Push local-only blocks to Google"
              aria-label="Push to Google"
            >
              {pushing === account.email ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpFromLine size={13} strokeWidth={2.2} />}
            </button>
            <button
              type="button"
              className="cv-icon-btn is-sm"
              aria-label="Account options"
              onClick={(e) => setMenu({ email: account.email, anchor: e.currentTarget })}
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        )
      })}

      <PopoverMenu anchor={menu?.anchor ?? null} open={Boolean(menu)} onClose={() => setMenu(null)} width={200}>
        <button
          type="button"
          className="cv-menu-action"
          disabled={connecting}
          onClick={() => {
            setMenu(null)
            onConnect()
          }}
        >
          <Plus size={13} /> Add another account
        </button>
        <button
          type="button"
          className="cv-menu-action is-danger"
          disabled={Boolean(menu && disconnecting === menu.email)}
          onClick={() => {
            if (menu) onDisconnect(menu.email)
            setMenu(null)
          }}
        >
          <LogOut size={13} /> Disconnect
        </button>
      </PopoverMenu>
    </section>
  )
}
