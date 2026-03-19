"use client"

import dynamic from "next/dynamic"
import { useCallback, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { useChatPanel } from "@/components/chat-provider"

type ChatPanelProps = {
  dayKey?: string | null
}

const DEFAULT_PANEL_WIDTH = 380
const MIN_PANEL_WIDTH = 320
const MAX_PANEL_WIDTH = 700

const Chat = dynamic(
  () => import("@/app/chat").then((module) => module.Chat),
  {
    ssr: false,
    loading: () => <div className="flex-1 bg-background" />,
  },
)

export function ChatPanel({ dayKey }: ChatPanelProps) {
  const { state } = useChatPanel()
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

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
        {/* Chat content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {state.isOpen ? <Chat dayKey={dayKey} /> : null}
        </div>
      </div>
    </div>
  )
}
