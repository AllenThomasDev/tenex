"use client";

import { getToolName, isToolUIPart } from "ai";
import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useSWRConfig } from "swr";

import { type DayEvent, fetchDayEvents } from "@/hooks/use-day-events";
import { cn } from "@/lib/utils";

import { useChatPanel } from "@/components/chat-provider";
import { ChatEventList } from "@/components/chat-event-list";
import { ChatFreeBusy, type FreeBusyData } from "@/components/chat-freebusy";
import { ChatEmailDraft, type EmailDraftData } from "@/components/chat-email-draft";
import { ChatContactResults } from "@/components/chat-contact-results";
import { assistant } from "@/lib/assistant";
import type { ContactSearchResponse } from "@/lib/tools/google-contacts";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";

type ChatProps = {
  dayKey?: string | null;
};

const DAY_MUTATION_TOOLS = new Set([
  "createEvent",
  "updateEvent",
  "deleteEvent",
]);

function formatEventTime(dateString?: string) {
  if (!dateString) return ""
  try {
    return format(parseISO(dateString), "h:mm a")
  } catch {
    return ""
  }
}

function EventPicker({
  events,
  activeIndex,
  onSelect,
}: {
  events: DayEvent[]
  activeIndex: number
  onSelect: (index: number) => void
}) {
  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5">
        <CalendarDays className="size-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Reference an event
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {events.map((event, i) => {
          const num = String(i + 1).padStart(2, "0")
          const time = event.isAllDay
            ? "All day"
            : [formatEventTime(event.start), formatEventTime(event.end)]
                .filter(Boolean)
                .join(" – ")
          return (
            <button
              key={event.id ?? i}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                i === activeIndex && "bg-accent",
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(i)
              }}
            >
              <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 font-mono text-xs font-medium text-primary">
                #{num}
              </span>
              <span className="min-w-0 truncate font-medium">{event.title}</span>
              {time && (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {time}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EventRefText({
  text,
  events,
}: {
  text: string
  events: DayEvent[] | undefined
}) {
  if (!events?.length) return <>{text}</>

  const parts = text.split(/(#\d{2}\b)/g)

  return (
    <>
      {parts.map((segment, i) => {
        const match = segment.match(/^#(\d{2})$/)
        if (!match) return <span key={i}>{segment}</span>

        const index = parseInt(match[1], 10) - 1
        if (index < 0 || index >= events.length) {
          return <span key={i}>{segment}</span>
        }

        const event = events[index]
        return (
          <span
            key={i}
            className="inline-flex items-baseline gap-1 rounded-sm bg-primary/10 px-1 font-medium text-primary"
          >
            {event.title}
            <span className="text-xs opacity-50">{segment}</span>
          </span>
        )
      })}
    </>
  )
}

function renderToolMessage(
  part: Parameters<typeof getToolName>[0] & {
    state: string;
    output?: unknown;
  }
) {
  const toolName = getToolName(part);

  if (part.state !== "output-available") {
    return "Loading calendar events…";
  }

  if (toolName === "createEvent") return "Created calendar event.";
  if (toolName === "updateEvent") return "Updated calendar event.";
  if (toolName === "deleteEvent") return "Deleted calendar event.";
  if (Array.isArray(part.output)) {
    return `Fetched ${part.output.length} event${part.output.length !== 1 ? "s" : ""}`;
  }

  return "Calendar action completed.";
}

export function Chat({ dayKey }: ChatProps) {
  const { chat } = useChatPanel();
  const { messages, sendMessage, status } = chat;
  const { mutate } = useSWRConfig();
  const { data: dayEvents } = useSWR<DayEvent[]>(dayKey ?? null, fetchDayEvents);
  const refreshedToolCallIdsRef = useRef(new Set<string>());
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIndex, setPickerIndex] = useState(0);
  const pickerHashPosRef = useRef<number>(-1);

  const isStreaming = status === "submitted" || status === "streaming";

  const getTextarea = useCallback(
    () => inputContainerRef.current?.querySelector("textarea") ?? null,
    [],
  );

  const handlePickerSelect = useCallback(
    (eventIndex: number) => {
      const textarea = getTextarea();
      if (!textarea) return;

      const token = `#${String(eventIndex + 1).padStart(2, "0")}`
      const hashPos = pickerHashPosRef.current;
      const before = textarea.value.slice(0, hashPos);
      const cursorPos = textarea.selectionStart;
      const after = textarea.value.slice(cursorPos);
      const newValue = before + token + after;

      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!;
      nativeSetter.call(textarea, newValue);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      const newPos = before.length + token.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.focus();
      setPickerOpen(false);
    },
    [getTextarea],
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!dayEvents?.length) {
        setPickerOpen(false);
        return;
      }

      const textarea = e.currentTarget;
      const pos = textarea.selectionStart;
      const textBefore = textarea.value.slice(0, pos);

      // Check if cursor is right after a `#` possibly followed by digits
      const match = textBefore.match(/#(\d{0,2})$/);
      if (match) {
        pickerHashPosRef.current = pos - match[0].length;
        setPickerOpen(true);
        setPickerIndex(0);
      } else {
        setPickerOpen(false);
      }
    },
    [dayEvents],
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!pickerOpen || !dayEvents?.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPickerIndex((prev) => Math.min(prev + 1, dayEvents.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setPickerIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handlePickerSelect(pickerIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPickerOpen(false);
      }
    },
    [pickerOpen, dayEvents, pickerIndex, handlePickerSelect],
  );

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

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="gap-3 p-4">
          {messages.length === 0 && (
            <ConversationEmptyState
              icon={
                <span className="[&>svg]:size-8">{assistant.icon}</span>
              }
              title={assistant.name}
              description={assistant.tagline}
            />
          )}

          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    if (message.role === "user") {
                      return (
                        <p key={`${message.id}-text-${i}`} className="text-sm whitespace-pre-wrap">
                          <EventRefText text={part.text} events={dayEvents} />
                        </p>
                      );
                    }
                    return (
                      <MessageResponse
                        key={`${message.id}-text-${i}`}
                        isAnimating={
                          isStreaming &&
                          message === messages[messages.length - 1]
                        }
                      >
                        {part.text}
                      </MessageResponse>
                    );
                  }
                  if (part.type === "tool-displayEvents") {
                    if (
                      part.state === "output-available" &&
                      Array.isArray(part.output)
                    ) {
                      return <ChatEventList key={i} events={part.output} />;
                    }
                    return (
                      <p
                        key={i}
                        className="text-sm italic text-muted-foreground"
                      >
                        Loading your events…
                      </p>
                    );
                  }
                  if (part.type === "tool-displayFreeBusy") {
                    if (part.state === "output-available" && part.output) {
                      return (
                        <ChatFreeBusy key={i} data={part.output as FreeBusyData} />
                      );
                    }
                    return (
                      <p
                        key={i}
                        className="text-sm italic text-muted-foreground"
                      >
                        Checking availability…
                      </p>
                    );
                  }
                  if (part.type === "tool-displayEmailDraft") {
                    if (part.state === "output-available" && part.output) {
                      return (
                        <ChatEmailDraft key={i} draft={part.output as EmailDraftData} />
                      );
                    }
                    return (
                      <p
                        key={i}
                        className="text-sm italic text-muted-foreground"
                      >
                        Drafting email…
                      </p>
                    );
                  }
                  if (part.type === "tool-displayContacts") {
                    if (part.state === "output-available" && part.output) {
                      return (
                        <ChatContactResults key={i} data={part.output as ContactSearchResponse} />
                      );
                    }
                    return (
                      <p
                        key={i}
                        className="text-sm italic text-muted-foreground"
                      >
                        Looking up contacts...
                      </p>
                    );
                  }
                  if (isToolUIPart(part)) {
                    return (
                      <p
                        key={i}
                        className="text-sm italic text-muted-foreground"
                      >
                        {renderToolMessage(part)}
                      </p>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Pinned input */}
      <div ref={inputContainerRef} className="relative shrink-0 p-3">
        {pickerOpen && dayEvents?.length ? (
          <EventPicker
            events={dayEvents}
            activeIndex={pickerIndex}
            onSelect={handlePickerSelect}
          />
        ) : null}
        <PromptInput
          onSubmit={({ text }) => {
            setPickerOpen(false);
            sendMessage({ text });
          }}
        >
          <PromptInputTextarea
            placeholder="Ask about your calendar…"
            autoComplete="off"
            spellCheck={false}
            className="min-h-[38px]"
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
          />
          <PromptInputSubmit status={status} onStop={chat.stop} />
        </PromptInput>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/50">
          AI can make mistakes. Verify important details.
        </p>
      </div>
    </div>
  );
}
