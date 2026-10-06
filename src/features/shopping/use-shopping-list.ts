// The Groceries tab's behaviour: the list and "Buy again" from the store plus every mutation,
// each applied optimistically, sent through shoppingService, then reconciled with the server's
// answer. A failure never rolls back by hand — it says so and re-reads the list, so the screen
// always converges on what the server holds. Removals leave an undo for a few seconds. The
// route shell (shopping-dashboard.tsx) does the initial loads.

import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { shoppingService } from '@/services/shopping-service'
import { useShoppingStore } from '@/store/shopping-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { getErrorMessage } from '@/lib/errors'
import {
  SHOPPING_MAX_BATCH,
  TEMP_ID_PREFIX,
  basketOf,
  aislesOf,
  cleanItemName,
  foldIn,
  mergeServerItems,
  tallyOf,
} from '@/lib/shopping'
import type { ShoppingCheckoutPayload, ShoppingItem, ShoppingItemPayload, ShoppingSuggestion } from '@/types/shopping'

/** What a pending undo will put back, and how to say so. */
export interface ShoppingUndo {
  id: number
  label: string
  restore: ShoppingItemPayload[]
}

const UNDO_MS = 9000

const asPayload = (item: ShoppingItem): ShoppingItemPayload => ({
  name: item.name,
  category: item.category,
  quantity: item.quantity,
  note: item.note,
  checked: item.checked,
})

export function useShoppingList() {
  const itemsState = useShoppingStore.use.items()
  const suggestionsState = useShoppingStore.use.suggestions()
  const actions = useShoppingStore.use.actions()
  const items = itemsState.data
  const [undo, setUndo] = useState<ShoppingUndo | null>(null)
  const undoTimer = useRef<number | null>(null)
  const seq = useRef(0)

  useEffect(
    () => () => {
      if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    },
    [],
  )

  const fail = useCallback(
    (error: unknown, fallback: string) => {
      toast.error(getErrorMessage(error, fallback))
      void actions.reloadItems()
    },
    [actions],
  )

  const offerUndo = useCallback((label: string, restore: ShoppingItemPayload[]) => {
    if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    seq.current += 1
    setUndo({ id: seq.current, label, restore })
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
  }, [])

  const dismissUndo = useCallback(() => {
    if (undoTimer.current != null) window.clearTimeout(undoTimer.current)
    setUndo(null)
  }, [])

  /** Adds items (≤ 50 at a time). Resolves false if the server refused them. */
  const addItems = useCallback(
    async (payloads: ShoppingItemPayload[]): Promise<boolean> => {
      const batch = payloads.filter((p) => cleanItemName(p.name)).slice(0, SHOPPING_MAX_BATCH)
      if (batch.length === 0) return true
      const now = new Date().toISOString()
      actions.applyItems((prev) => foldIn(prev, batch, () => `${TEMP_ID_PREFIX}${++seq.current}`, now))
      const res = await shoppingService.addItems(batch)
      if (res.error || !res.data) {
        fail(res.error, 'Could not add to your list')
        return false
      }
      const returned = res.data
      actions.applyItems((prev) => mergeServerItems(prev, returned))
      void actions.loadSuggestions()
      return true
    },
    [actions, fail],
  )

  /** Moves an item into the basket or back. Resolves true when that emptied the "to get" list. */
  const setChecked = useCallback(
    async (item: ShoppingItem, checked: boolean): Promise<boolean> => {
      const at = checked ? new Date().toISOString() : null
      // Read the store, not a render's snapshot: a tap that lands mid-request must see the latest list.
      const current = useShoppingStore.getState().items.data
      const completes = checked && current.every((other) => other.id === item.id || other.checked)
      actions.applyItems((prev) =>
        prev.map((other) => (other.id === item.id ? { ...other, checked, checkedAt: at } : other)),
      )
      const res = await shoppingService.setChecked(item.id, checked)
      if (res.error) {
        fail(res.error, 'Could not update that item')
        return false
      }
      return completes
    },
    [actions, fail],
  )

  const updateItem = useCallback(
    async (id: string, payload: ShoppingItemPayload): Promise<boolean> => {
      actions.applyItems((prev) =>
        prev.map((other) =>
          other.id === id
            ? {
                ...other,
                name: cleanItemName(payload.name),
                category: payload.category ?? other.category,
                quantity: payload.quantity?.trim() || null,
                note: payload.note?.trim() || null,
              }
            : other,
        ),
      )
      const res = await shoppingService.updateItem(id, payload)
      if (res.error || !res.data) {
        fail(res.error, 'Could not save that item')
        return false
      }
      const saved = res.data
      actions.applyItems((prev) => prev.map((other) => (other.id === saved.id ? saved : other)))
      return true
    },
    [actions, fail],
  )

  const removeItem = useCallback(
    async (item: ShoppingItem) => {
      actions.applyItems((prev) => prev.filter((other) => other.id !== item.id))
      offerUndo(`Removed ${item.name}`, [asPayload(item)])
      const res = await shoppingService.deleteItem(item.id)
      if (res.error) {
        dismissUndo()
        fail(res.error, 'Could not remove that item')
      }
    },
    [actions, dismissUndo, fail, offerUndo],
  )

  const clearBasket = useCallback(async () => {
    const basket = useShoppingStore.getState().items.data.filter((item) => item.checked)
    if (basket.length === 0) return
    actions.applyItems((prev) => prev.filter((item) => !item.checked))
    offerUndo(
      basket.length === 1 ? `Cleared ${basket[0].name}` : `Cleared ${basket.length} items from the basket`,
      basket.map(asPayload),
    )
    const res = await shoppingService.clearChecked()
    if (res.error) {
      dismissUndo()
      fail(res.error, 'Could not clear the basket')
    }
  }, [actions, dismissUndo, fail, offerUndo])

  /** "Buy again": add a remembered item (it leaves the suggestions at once). */
  const addSuggestion = useCallback(
    async (suggestion: ShoppingSuggestion) => {
      actions.applySuggestions((prev) => prev.filter((s) => s.name !== suggestion.name))
      return addItems([{ name: suggestion.name, category: suggestion.category }])
    },
    [actions, addItems],
  )

  const forgetSuggestion = useCallback(
    async (suggestion: ShoppingSuggestion) => {
      actions.applySuggestions((prev) => prev.filter((s) => s.name !== suggestion.name))
      const res = await shoppingService.forgetSuggestion(suggestion.name)
      if (res.error) {
        toast.error(getErrorMessage(res.error, 'Could not forget that'))
        void actions.loadSuggestions()
      }
    },
    [actions],
  )

  /**
   * "Done shopping": empties the basket and, with an amount, logs the shop in Finance. Not
   * optimistic — the basket only empties once the ledger has accepted the row.
   */
  const checkout = useCallback(
    async (payload: ShoppingCheckoutPayload): Promise<boolean> => {
      const res = await shoppingService.checkout(payload)
      if (res.error || !res.data) {
        toast.error(getErrorMessage(res.error, 'Could not finish the shop'))
        return false
      }
      const removed = new Set(res.data.removed.map((item) => item.id))
      actions.applyItems((prev) => prev.filter((item) => !removed.has(item.id) && !item.checked))
      void actions.loadSuggestions()
      toast.success(
        res.data.transactionId && payload.amount
          ? `Logged ₹${Math.round(payload.amount).toLocaleString('en-IN')} in Finance`
          : 'Basket cleared',
      )
      return true
    },
    [actions],
  )

  const applyUndo = useCallback(async () => {
    if (!undo) return
    const { restore } = undo
    dismissUndo()
    await addItems(restore)
  }, [addItems, dismissUndo, undo])

  const aisles = aislesOf(items)
  const basket = basketOf(items)
  const tally = tallyOf(items)

  return {
    items,
    aisles,
    basket,
    tally,
    /** Skeleton only when there is nothing to show yet; a revisit keeps the cached list on screen. */
    loading: isAwaitingData(itemsState) && items.length === 0,
    failed: itemsState.hasErrors && items.length === 0,
    reload: actions.loadItems,
    suggestions: suggestionsState.data,
    addSuggestion,
    forgetSuggestion,
    checkout,
    undo,
    dismissUndo,
    applyUndo,
    addItems,
    setChecked,
    updateItem,
    removeItem,
    clearBasket,
  }
}
