"use client"

import { Bot } from "lucide-react"

import { cn } from "@/lib/utils"
import { useChatPanel } from "@/components/chat-provider"

export function FloatingAssistantButton() {
  const { chat, state, toggleChat } = useChatPanel()
  const isWorking = chat.status === "submitted" || chat.status === "streaming"

  return (
    <button
      type="button"
      onClick={toggleChat}
      className={cn(
        "fixed top-4 right-4 z-30",
        "flex items-center justify-center",
        "w-8 h-8 rounded-full",
        "border border-border/60",
        "bg-background/80 backdrop-blur-sm",
        "shadow-sm hover:shadow-md",
        "text-muted-foreground/60 hover:text-foreground",
        "cursor-pointer transition-all duration-200",
        "hover:scale-105 active:scale-95",
        state.isOpen && "opacity-0 pointer-events-none",
      )}
      title="Assistant (⌘I)"
    >
      <Bot className="w-4 h-4" />
      {isWorking && (
        <span className="absolute inset-0 rounded-full border border-foreground/20 animate-ping" />
      )}
    </button>
  )
}
