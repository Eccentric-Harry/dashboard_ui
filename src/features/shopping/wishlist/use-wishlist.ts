// The Wishlist tab's behaviour: the wishes from the store and every action on them. Unlike the
// grocery list these are not optimistic (except letting go) — each one writes to Finance or
// reads a web page, so the card changes when the server says it happened. Finance's slices are
// re-read after anything that moved money or made a goal, so /finance is current on arrival.

import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { wishlistService } from '@/services/wishlist-service'
import { useWishlistStore } from '@/store/wishlist-store'
import { financeActions } from '@/store/finance-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { getErrorMessage } from '@/lib/errors'
import { splitWishes, wishTotals } from '@/lib/wishlist'
import type { LinkPreview, WishlistBuyPayload, WishlistItem, WishlistPayload } from '@/types/wishlist'

const UNDO_MS = 9000

export function useWishlist() {
  const wishesState = useWishlistStore.use.wishes()
  const actions = useWishlistStore.use.actions()
  const wishes = wishesState.data
  const [undo, setUndo] = useState<{ id: number; label: string; wish: WishlistItem } | null>(null)
  const undoTimer = useRef<number | null>(null)
  const seq = useRef(0)

  useEffect(
    () => () => {
      if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    },
    [],
  )

  const dismissUndo = useCallback(() => {
    if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    setUndo(null)
  }, [])

  const preview = useCallback(async (url: string): Promise<LinkPreview | null> => {
    const res = await wishlistService.previewLink(url)
    return res.error || !res.data ? null : res.data
  }, [])

  const create = useCallback(
    async (payload: WishlistPayload): Promise<boolean> => {
      const res = await wishlistService.createWish(payload)
      if (res.error || !res.data) {
        toast.error(getErrorMessage(res.error, 'Could not add that'))
        return false
      }
      actions.applyWish(res.data)
      toast.success(`Added ${res.data.name}`)
      return true
    },
    [actions],
  )

  const update = useCallback(
    async (id: string, payload: WishlistPayload): Promise<boolean> => {
      const res = await wishlistService.updateWish(id, payload)
      if (res.error || !res.data) {
        toast.error(getErrorMessage(res.error, 'Could not save that'))
        return false
      }
      actions.applyWish(res.data)
      return true
    },
    [actions],
  )

  const refresh = useCallback(
    async (wish: WishlistItem) => {
      const res = await wishlistService.refreshWish(wish.id)
      if (res.error || !res.data) {
        toast.error(getErrorMessage(res.error, 'Could not check the price'))
        return
      }
      actions.applyWish(res.data)
      const { price } = res.data
      toast.success(
        price == null
          ? 'No price on the page — add it yourself'
          : price === wish.price
            ? `Still ₹${Math.round(price).toLocaleString('en-IN')}`
            : `Now ₹${Math.round(price).toLocaleString('en-IN')}`,
      )
    },
    [actions],
  )

  const buy = useCallback(
    async (wish: WishlistItem, payload: WishlistBuyPayload): Promise<boolean> => {
      const res = await wishlistService.buyWish(wish.id, payload)
      if (res.error || !res.data) {
        toast.error(getErrorMessage(res.error, 'Could not log the purchase'))
        return false
      }
      actions.applyWish(res.data)
      void financeActions.loadAll()
      if (wish.savingsGoalId) void financeActions.loadGoals()
      toast.success(`Logged ₹${Math.round(payload.price).toLocaleString('en-IN')} in Finance`)
      return true
    },
    [actions],
  )

  const saveFor = useCallback(
    async (wish: WishlistItem): Promise<boolean> => {
      const res = await wishlistService.saveForWish(wish.id)
      if (res.error || !res.data) {
        toast.error(getErrorMessage(res.error, 'Could not start saving for it'))
        return false
      }
      actions.applyWish(res.data)
      void financeActions.loadGoals()
      toast.success(`Saving for ${wish.name} — it's in Finance`)
      return true
    },
    [actions],
  )

  /** Optimistic, with an undo — letting go should feel as light as it is. */
  const letGo = useCallback(
    async (wish: WishlistItem) => {
      actions.applyWish({ ...wish, status: 'LET_GO', closedAt: new Date().toISOString() })
      if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
      seq.current += 1
      setUndo({ id: seq.current, label: `Let go of ${wish.name}`, wish })
      undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
      const res = await wishlistService.letGoWish(wish.id)
      if (res.error || !res.data) {
        dismissUndo()
        actions.applyWish(wish)
        toast.error(getErrorMessage(res.error, 'Could not update that'))
        return
      }
      actions.applyWish(res.data)
    },
    [actions, dismissUndo],
  )

  const reopen = useCallback(
    async (wish: WishlistItem) => {
      const res = await wishlistService.reopenWish(wish.id)
      if (res.error || !res.data) {
        toast.error(getErrorMessage(res.error, 'Could not reopen that'))
        return
      }
      actions.applyWish(res.data)
    },
    [actions],
  )

  const applyUndo = useCallback(async () => {
    if (!undo) return
    const { wish } = undo
    dismissUndo()
    await reopen(wish)
  }, [dismissUndo, reopen, undo])

  const remove = useCallback(
    async (wish: WishlistItem) => {
      actions.removeWish(wish.id)
      const res = await wishlistService.deleteWish(wish.id)
      if (res.error) {
        toast.error(getErrorMessage(res.error, 'Could not delete that'))
        void actions.reloadWishes()
      }
    },
    [actions],
  )

  const { open, closed } = splitWishes(wishes)

  return {
    wishes,
    open,
    closed,
    totals: wishTotals(wishes),
    loading: isAwaitingData(wishesState) && wishes.length === 0,
    failed: wishesState.hasErrors && wishes.length === 0,
    reload: actions.loadWishes,
    preview,
    create,
    update,
    refresh,
    buy,
    saveFor,
    letGo,
    reopen,
    remove,
    undo,
    applyUndo,
  }
}
