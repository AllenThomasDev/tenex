"use client";

import { useChat } from "@ai-sdk/react";
import { getToolName, isToolUIPart } from "ai";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatPanel } from "@/components/chat-provider";

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
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);
  const { messages, sendMessage, status } = useChat();
  const { mutate } = useSWRConfig();
  const refreshedToolCallIdsRef = useRef(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  function sendPrompt(prompt: string) {
    sendMessage({ text: prompt });
    setInput("");
    setPendingConfirmation(null);
  }

  function isPotentiallyDestructivePrompt(prompt: string) {
    return /\b(delete|remove|cancel|decline)\b/i.test(prompt);
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
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-full rounded-lg px-4 py-3 ${
              message.role === "user"
                ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                : "self-start bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
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
                  <p key={i} className="text-sm italic text-zinc-500">
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

      {/* Pinned bottom: confirmation + input */}
      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800">
        {pendingConfirmation ? (
          <div className="border-b border-amber-300/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-medium">Confirm Destructive Action</p>
            <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
              This request may modify or remove an event immediately.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => sendPrompt(pendingConfirmation)}
              >
                Confirm
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingConfirmation(null)}
              >
                Keep Editing
              </Button>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            if (isPotentiallyDestructivePrompt(input)) {
              setPendingConfirmation(input);
              return;
            }
            sendPrompt(input);
          }}
          className="flex gap-2 p-3"
        >
          <label className="sr-only" htmlFor="calendar-chat-input">
            Ask the calendar assistant
          </label>
          <Input
            id="calendar-chat-input"
            aria-describedby={pendingConfirmation ? "calendar-chat-warning" : undefined}
            autoComplete="off"
            name="calendarPrompt"
            spellCheck={false}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (pendingConfirmation) setPendingConfirmation(null);
            }}
            placeholder="Ask about your calendar…"
            className="h-10 flex-1 rounded-lg border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-10 px-4"
          >
            Send
          </Button>
          {pendingConfirmation ? (
            <p id="calendar-chat-warning" className="sr-only">
              This request needs confirmation before it is sent.
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
