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

interface ChatPanelState {
  isOpen: boolean
}

interface ChatPanelContextValue {
  chat: ReturnType<typeof useChat>
  state: ChatPanelState
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

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }),
    [],
  )
  const chat = useChat({ transport })
  const [state, setState] = useState<ChatPanelState>({ isOpen: false })
  const isOpenRef = useRef(false)

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
    <ChatPanelContext.Provider value={{ chat, state, openChat, closeChat, toggleChat }}>
      {children}
    </ChatPanelContext.Provider>
  )
}
