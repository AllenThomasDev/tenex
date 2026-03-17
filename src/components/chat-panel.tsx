"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, ChevronRight, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Chat } from "@/app/chat"
import { useChatPanel } from "@/components/chat-provider"

type ChatPanelProps = {
  dayKey?: string | null
}

const DEFAULT_PANEL_WIDTH = 380
const MIN_PANEL_WIDTH = 320
const MAX_PANEL_WIDTH = 700

export function ChatPanel({ dayKey }: ChatPanelProps) {
  const { state, closeChat } = useChatPanel()
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // Defer rendering until after hydration — panel starts hidden (translate-x-full)
  // and depends on client-only state, so SSR would cause hydration mismatches.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragRef.current = { startX: e.clientX, startWidth: panelWidth }
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        // Dragging left = increasing width (panel anchored to right)
        const delta = dragRef.current.startX - ev.clientX
        const raw = dragRef.current.startWidth + delta
        setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, raw)))
      }
      const onUp = () => {
        dragRef.current = null
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"
    },
    [panelWidth],
  )

  if (!mounted) return null

  return (
    <div
      className={cn(
        "fixed top-10 right-0 z-40 h-[calc(100dvh-2.5rem)] w-full",
        "bg-background border-l border-border",
        "flex flex-row shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.25)]",
        "transition-transform duration-300 ease-in-out",
        state.isOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
      style={{ maxWidth: panelWidth }}
    >
      {/* Resize drag handle */}
      <div
        onMouseDown={handleResizeStart}
        className="hidden sm:flex shrink-0 w-1 cursor-col-resize hover:bg-foreground/10 active:bg-foreground/15 transition-colors"
      />

      {/* Panel content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Side chevron close tab */}
        <button
          type="button"
          onClick={closeChat}
          className={cn(
            "absolute -left-6 top-1/2 -translate-y-1/2 z-10",
            "flex items-center justify-center pl-1 pr-0.5",
            "w-6 h-10 rounded-l-full",
            "bg-background border border-r-0 border-border",
            "text-muted-foreground hover:text-foreground",
            "cursor-pointer transition-all duration-200",
            !state.isOpen && "hidden",
          )}
        >
          <ChevronRight className="w-3 h-3" />
        </button>

        {/* Panel header */}
        <div className="shrink-0 flex items-center gap-1.5 pl-3 pr-2 py-1.5 border-b border-border/60">
          <Bot className="w-3.5 h-3.5 text-foreground/50" />
          <span className="text-xs font-medium text-foreground/70 truncate">
            Assistant
          </span>
          <button
            type="button"
            onClick={closeChat}
            className="ml-auto p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-150 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Chat content */}
        <div className="flex-1 min-h-0 flex flex-col">
          <Chat dayKey={dayKey} />
        </div>
      </div>
    </div>
  )
}
