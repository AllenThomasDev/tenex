"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { CalendarChatMessage } from "@/lib/chat-message"

interface ChatPanelState {
  isOpen: boolean
}

interface ChatPanelContextValue {
  chat: ReturnType<typeof useChat<CalendarChatMessage>>
  state: ChatPanelState
  selectedEventIds: string[]
  toggleEventId: (id: string) => void
  focusEventId: (id: string) => void
  clearSelectedEvents: () => void
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null)

export function useChatPanel() {
  const ctx = useContext(ChatPanelContext)
  if (!ctx) throw new Error("useChatPanel must be used within ChatPanelProvider")
  return ctx
}

export function ChatPanelProvider({ dayKey, children }: { dayKey?: string | null; children: ReactNode }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<CalendarChatMessage>({
        api: "/api/chat",
        body: () => ({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          dayKey,
        }),
      }),
    [dayKey],
  )
  const chat = useChat<CalendarChatMessage>({ transport })
  const [state, setState] = useState<ChatPanelState>({ isOpen: false })
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const isOpenRef = useRef(false)

  // Clear selections when the day changes
  const prevDayKeyRef = useRef(dayKey)
  useEffect(() => {
    if (prevDayKeyRef.current !== dayKey) {
      prevDayKeyRef.current = dayKey
      setSelectedEventIds([])
    }
  }, [dayKey])

  const toggleEventId = useCallback((id: string) => {
    setSelectedEventIds((prev) => {
      const included = prev.includes(id)
      if (isOpenRef.current) {
        // Chat open: toggle in array
        return included ? prev.filter((x) => x !== id) : [...prev, id]
      }
      // Chat closed: max 1 — select or deselect
      return included ? [] : [id]
    })
  }, [])

  const focusEventId = useCallback((id: string) => {
    setSelectedEventIds((prev) => {
      if (isOpenRef.current) {
        // Chat open: don't change selections, just let focus highlight move
        return prev
      }
      // Chat closed: single select
      return [id]
    })
  }, [])

  const clearSelectedEvents = useCallback(() => {
    setSelectedEventIds([])
  }, [])

  const openChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }))
    isOpenRef.current = true
  }, [])

  const closeChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
    isOpenRef.current = false
  }, [])

  const toggleChat = useCallback(() => {
    setState(prev => {
      const next = !prev.isOpen
      isOpenRef.current = next
      return { ...prev, isOpen: next }
    })
  }, [])

  // ⌘I / Ctrl+I to toggle panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault()
        toggleChat()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [toggleChat])

  return (
    <ChatPanelContext.Provider
      value={{
        chat,
        state,
        selectedEventIds,
        toggleEventId,
        focusEventId,
        clearSelectedEvents,
        openChat,
        closeChat,
        toggleChat,
      }}
    >
      {children}
    </ChatPanelContext.Provider>
  )
}
