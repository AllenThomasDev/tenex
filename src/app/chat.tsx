"use client";

import { useChat } from "@ai-sdk/react";
import { getToolName, isToolUIPart } from "ai";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";

import { ArrowUp } from "lucide-react";
import { useChatPanel } from "@/components/chat-provider";
import { assistant } from "@/lib/assistant";

type ChatProps = {
  dayKey?: string | null
}

const DAY_MUTATION_TOOLS = new Set([
  "createEvent",
  "updateEvent",
  "deleteEvent",
]);

function renderToolMessage(part: Parameters<typeof getToolName>[0] & {
  state: string;
  output?: unknown;
}) {
  const toolName = getToolName(part);

  if (part.state !== "output-available") {
    return "Loading calendar events…";
  }

  if (toolName === "createEvent") {
    return "Created calendar event.";
  }

  if (toolName === "updateEvent") {
    return "Updated calendar event.";
  }

  if (toolName === "deleteEvent") {
    return "Deleted calendar event.";
  }

  if (Array.isArray(part.output)) {
    return `Fetched ${part.output.length} event${part.output.length !== 1 ? "s" : ""}`;
  }

  return "Calendar action completed.";
}

export function Chat({ dayKey }: ChatProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const { mutate } = useSWRConfig();
  const refreshedToolCallIdsRef = useRef(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";
  const { setIsWorking } = useChatPanel();

  // Sync loading state to the panel so the floating button can show a working indicator
  useEffect(() => {
    setIsWorking(isLoading);
  }, [isLoading, setIsWorking]);

  // Refresh the day's events after any calendar mutation tool completes
  useEffect(() => {
    if (!dayKey) return;

    let shouldRefreshDay = false;

    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part) || part.state !== "output-available") continue;

        const toolName = getToolName(part);
        if (!DAY_MUTATION_TOOLS.has(toolName)) continue;
        if (refreshedToolCallIdsRef.current.has(part.toolCallId)) continue;

        refreshedToolCallIdsRef.current.add(part.toolCallId);
        shouldRefreshDay = true;
      }
    }

    if (shouldRefreshDay) {
      void mutate(dayKey);
    }
  }, [dayKey, messages, mutate]);

  // Scroll to latest message synchronously before paint
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  function sendPrompt(prompt: string) {
    sendMessage({ text: prompt });
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable message history — fills available panel height */}
      <div
        aria-label="Calendar assistant conversation"
        aria-live="polite"
        aria-relevant="additions text"
        role="log"
        className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <span className="text-muted-foreground [&>svg]:size-8">{assistant.icon}</span>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">{assistant.name}</p>
              <p className="text-xs text-muted-foreground/60">{assistant.tagline}</p>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-full rounded-lg px-4 py-3 ${
              message.role === "user"
                ? "self-end bg-foreground text-background"
                : "self-start bg-muted text-foreground"
            }`}
          >
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <p key={i} className="whitespace-pre-wrap break-words">
                    {part.text}
                  </p>
                );
              }
              if (isToolUIPart(part)) {
                return (
                  <p key={i} className="text-sm italic text-muted-foreground">
                    {renderToolMessage(part)}
                  </p>
                );
              }
              return null;
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Pinned input */}
      <div className="shrink-0 p-3">
        <div className="rounded-xl border border-border/60 bg-card/50 transition-all duration-200 focus-within:border-foreground/15 focus-within:bg-background">
          <label className="sr-only" htmlFor="calendar-chat-input">
            Ask the calendar assistant
          </label>
          <div className="flex items-end">
            <textarea
              ref={textareaRef}
              id="calendar-chat-input"
              data-ghost-input
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!input.trim() || isLoading) return;
                  sendPrompt(input);
                }
              }}
              placeholder="Ask about your calendar…"
              autoComplete="off"
              spellCheck={false}
              className="min-h-[38px] flex-1 resize-none overflow-hidden bg-transparent py-2.5 pl-3.5 pr-1.5 text-[13px] placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="shrink-0 pb-1.5 pr-1.5">
              <button
                type="button"
                onClick={() => { if (input.trim() && !isLoading) sendPrompt(input); }}
                disabled={!input.trim() || isLoading}
                title="Send (Enter)"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 ${
                  input.trim() && !isLoading
                    ? "cursor-pointer bg-foreground text-background hover:bg-foreground/90"
                    : "cursor-default bg-muted/50 text-muted-foreground"
                }`}
              >
                <ArrowUp className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/50">
          AI can make mistakes. Verify important details.
        </p>
      </div>
    </div>
  );
}
