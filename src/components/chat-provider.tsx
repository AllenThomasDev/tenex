"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

interface ChatPanelState {
  isOpen: boolean
  isWorking: boolean
}

interface ChatPanelContextValue {
  state: ChatPanelState
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  setIsWorking: (working: boolean) => void
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null)

export function useChatPanel() {
  const ctx = useContext(ChatPanelContext)
  if (!ctx) throw new Error("useChatPanel must be used within ChatPanelProvider")
  return ctx
}

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatPanelState>({ isOpen: false, isWorking: false })
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

  const setIsWorking = useCallback((working: boolean) => {
    setState(prev => ({ ...prev, isWorking: working }))
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
    <ChatPanelContext.Provider value={{ state, openChat, closeChat, toggleChat, setIsWorking }}>
      {children}
    </ChatPanelContext.Provider>
  )
}
