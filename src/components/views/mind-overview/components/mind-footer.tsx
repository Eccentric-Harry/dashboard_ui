import { useState } from 'react'
import { Archive, LifeBuoy, Lock } from 'lucide-react'
import { mindService } from '../../../../services/mind-service'
import { mindActions, useMindStore } from '../../../../store/mind-store'
import { ConfirmDialog } from '../../../ui/confirm-dialog'
import { mindFormatTimestamp } from '../mind-types'

/**
 * The route's quiet footer: real help, the sealed archive, and one honest line.
 *
 * Both links are deliberately understated. SOS has to be one tap away at all times, but
 * a crisis button in the corner of every screen changes what the page feels like. The
 * archive is worse — it is the one place sealed thoughts can be read again, so it sits
 * behind a confirm step and is never linked from the inbox or anywhere else.
 */

type MindFooterProps = {
  onOpenSos: () => void
}

function MindFooter({ onOpenSos }: MindFooterProps) {
  const sealedEntries = useMindStore.use.sealedEntries()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const openArchive = async () => {
    setConfirmOpen(false)
    setLoading(true)
    const res = await mindService.getSealedEntries()
    setLoading(false)
    mindActions.setSealedEntries(res.error ? [] : (res.data ?? []))
  }

  const closeArchive = () => mindActions.setSealedEntries(null)

  return (
    <footer className="mind-footer">
      <p className="mind-footer-note">
        This is a tool you use alongside real support — not instead of it.
      </p>

      <div className="mind-footer-links">
        <button type="button" className="mind-footer-link mind-footer-link--sos" onClick={onOpenSos}>
          <LifeBuoy size={12} />
          Need help right now
        </button>

        {sealedEntries === null ? (
          <button
            type="button"
            className="mind-footer-link"
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
          >
            <Lock size={12} />
            Sealed archive
          </button>
        ) : (
          <button type="button" className="mind-footer-link" onClick={closeArchive}>
            <Lock size={12} />
            Close archive
          </button>
        )}
      </div>

      {sealedEntries !== null && (
        <div className="mind-archive">
          <div className="mind-archive-head">
            <Archive size={13} />
            <span>
              {sealedEntries.length === 0
                ? 'Nothing sealed. Nothing here to read.'
                : `${sealedEntries.length} sealed ${sealedEntries.length === 1 ? 'thought' : 'thoughts'}`}
            </span>
          </div>
          {sealedEntries.length > 0 && (
            <ul className="mind-archive-list">
              {sealedEntries.map((entry) => (
                <li key={entry.id} className="mind-archive-item">
                  <p className="mind-archive-text">{entry.text ?? '(no text was saved)'}</p>
                  <span className="mind-archive-date">
                    {entry.createdAt ? mindFormatTimestamp(entry.createdAt) : ''}
                    {entry.intrusive?.category && entry.intrusive.category !== 'UNNAMED'
                      ? ` · ${entry.intrusive.category.toLowerCase()}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Open the sealed archive?"
        message="These are thoughts you chose not to meet again. Opening this shows them in full. There is usually no need — the archive exists so you can delete them, not so you can re-read them."
        confirmLabel="Open anyway"
        cancelLabel="Leave it closed"
        onConfirm={() => void openArchive()}
        onCancel={() => setConfirmOpen(false)}
      />
    </footer>
  )
}

export { MindFooter }
