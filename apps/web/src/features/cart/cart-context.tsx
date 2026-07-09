'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface CartItem {
  eventId: string
  eventSlug: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  ticketTypeId: string
  ticketTypeName: string
  unitPrice: number
  quantity: number
  available: number
}

export interface CartEventGroup {
  eventId: string
  eventSlug: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  items: CartItem[]
  totalQuantity: number
  totalAmount: number
}

interface AddToCartInput extends Omit<CartItem, 'quantity'> {
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  eventGroups: CartEventGroup[]
  totalQuantity: number
  totalAmount: number
  addToCart: (item: AddToCartInput) => void
  setItemQuantity: (eventId: string, ticketTypeId: string, quantity: number) => void
  removeItem: (eventId: string, ticketTypeId: string) => void
  clearCart: () => void
  getItemsForEvent: (eventId: string) => CartItem[]
}

const CART_STORAGE_KEY = 'mypass360-cart'

const CartContext = createContext<CartContextValue | undefined>(undefined)

function sortByEventAndTicket(items: CartItem[]): CartItem[] {
  return [...items].sort((left, right) => {
    if (left.eventDate !== right.eventDate) {
      return new Date(left.eventDate).getTime() - new Date(right.eventDate).getTime()
    }

    if (left.eventTitle !== right.eventTitle) {
      return left.eventTitle.localeCompare(right.eventTitle)
    }

    return left.ticketTypeName.localeCompare(right.ticketTypeName)
  })
}

function groupCartItems(items: CartItem[]): CartEventGroup[] {
  const groups = new Map<string, CartItem[]>()

  for (const item of items) {
    const current = groups.get(item.eventId) ?? []
    groups.set(item.eventId, [...current, item])
  }

  return [...groups.entries()].map(([eventId, groupedItems]) => {
    const firstItem = groupedItems[0]
    const totalQuantity = groupedItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = groupedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    return {
      eventId,
      eventSlug: firstItem.eventSlug,
      eventTitle: firstItem.eventTitle,
      eventDate: firstItem.eventDate,
      eventLocation: firstItem.eventLocation,
      items: sortByEventAndTicket(groupedItems),
      totalQuantity,
      totalAmount,
    }
  })
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY)

      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[]
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items, isHydrated])

  const addToCart = (input: AddToCartInput) => {
    if (input.quantity <= 0) {
      return
    }

    setItems((current) => {
      const existingIndex = current.findIndex(
        (item) => item.eventId === input.eventId && item.ticketTypeId === input.ticketTypeId
      )

      if (existingIndex === -1) {
        const nextItem = {
          ...input,
          quantity: Math.min(input.quantity, input.available),
        }

        return sortByEventAndTicket([...current, nextItem])
      }

      const nextItems = [...current]
      const existingItem = nextItems[existingIndex]
      const mergedQuantity = Math.min(existingItem.quantity + input.quantity, input.available)

      nextItems[existingIndex] = {
        ...existingItem,
        ...input,
        quantity: mergedQuantity,
      }

      return sortByEventAndTicket(nextItems)
    })
  }

  const setItemQuantity = (eventId: string, ticketTypeId: string, quantity: number) => {
    setItems((current) => {
      const nextItems = current.flatMap((item) => {
        if (item.eventId !== eventId || item.ticketTypeId !== ticketTypeId) {
          return [item]
        }

        if (quantity <= 0) {
          return []
        }

        return [
          {
            ...item,
            quantity: Math.min(quantity, item.available),
          },
        ]
      })

      return sortByEventAndTicket(nextItems)
    })
  }

  const removeItem = (eventId: string, ticketTypeId: string) => {
    setItems((current) =>
      sortByEventAndTicket(
        current.filter((item) => item.eventId !== eventId || item.ticketTypeId !== ticketTypeId)
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const value = useMemo<CartContextValue>(() => {
    const orderedItems = sortByEventAndTicket(items)
    const eventGroups = groupCartItems(orderedItems)

    return {
      items: orderedItems,
      eventGroups,
      totalQuantity: orderedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: orderedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      addToCart,
      setItemQuantity,
      removeItem,
      clearCart,
      getItemsForEvent: (eventId: string) =>
        orderedItems.filter((item) => item.eventId === eventId),
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }

  return context
}