"use client";

import { getToolName, isToolUIPart } from "ai";
import { format, parseISO } from "date-fns";
import { CalendarDays, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useSWRConfig } from "swr";

import { type DayEvent, fetchDayEvents } from "@/hooks/use-day-events";

import { useChatPanel } from "@/components/chat-provider";
import { ChatEventList } from "@/components/chat-event-list";
import { ChatFreeBusy, type FreeBusyData } from "@/components/chat-freebusy";
import { ChatEmailDraft, type EmailDraftData } from "@/components/chat-email-draft";
import { ChatContactResults } from "@/components/chat-contact-results";
import { assistant } from "@/lib/assistant";
import type { ChatMessageMetadata, ReferredCalendarEvent } from "@/lib/chat-message";
import type { ContactSearchResponse } from "@/lib/tools/google-contacts";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

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

function eventTimeLabel(event: DayEvent) {
  if (event.isAllDay) return "All day"
  return [formatEventTime(event.start), formatEventTime(event.end)]
    .filter(Boolean)
    .join(" – ")
}

function toReferredEvent(event: DayEvent): ReferredCalendarEvent {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    isAllDay: event.isAllDay,
    location: event.location,
  }
}

function getReferredEvents(metadata?: ChatMessageMetadata): ReferredCalendarEvent[] {
  return Array.isArray(metadata?.referredEvents) ? metadata.referredEvents : []
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
  const [referredEvents, setReferredEvents] = useState<number[]>([]);

  const isStreaming = status === "submitted" || status === "streaming";

  const getTextarea = useCallback(
    () => inputContainerRef.current?.querySelector("textarea") ?? null,
    [],
  );

  const addReferredEvent = useCallback(
    (eventIndex: number) => {
      setReferredEvents((prev) =>
        prev.includes(eventIndex) ? prev : [...prev, eventIndex],
      );
      getTextarea()?.focus();
      setPickerOpen(false);
    },
    [getTextarea],
  );

  const removeReferredEvent = useCallback((eventIndex: number) => {
    setReferredEvents((prev) => prev.filter((i) => i !== eventIndex));
  }, []);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "#" || !dayEvents?.length) return;

      e.preventDefault();
      setPickerOpen(true);
    },
    [dayEvents],
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

          {messages.map((message) => {
            const msgEvents = getReferredEvents(message.metadata);
            return (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.role === "user" && msgEvents.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {msgEvents.map((event, index) => {
                      return (
                        <span
                          key={event.id ?? `${message.id}-${index}`}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          <CalendarDays className="size-3" />
                          {event.title}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <MessageResponse
                        key={`${message.id}-text-${i}`}
                        isAnimating={
                          isStreaming &&
                          message.role === "assistant" &&
                          message === messages[messages.length - 1]
                        }
                      >
                        {part.text}
                      </MessageResponse>
                    );
                  }
                  if (isToolUIPart(part) && getToolName(part) === "displayEvents") {
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
                  if (isToolUIPart(part) && getToolName(part) === "displayFreeBusy") {
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
                  if (isToolUIPart(part) && getToolName(part) === "displayEmailDraft") {
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
                  if (isToolUIPart(part) && getToolName(part) === "displayContacts") {
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
            );
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Pinned input */}
      <div ref={inputContainerRef} className="shrink-0 p-3">
        {referredEvents.length > 0 && dayEvents ? (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {referredEvents.map((eventIndex) => {
              const event = dayEvents[eventIndex];
              if (!event) return null;
              return (
                <span
                  key={eventIndex}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  <CalendarDays className="size-3" />
                  {event.title}
                  <button
                    type="button"
                    className="ml-0.5 rounded-sm hover:bg-primary/20"
                    onClick={() => removeReferredEvent(eventIndex)}
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
        <Popover open={pickerOpen && !!dayEvents?.length} onOpenChange={setPickerOpen}>
          <PopoverAnchor asChild>
            <PromptInput
              onSubmit={({ text }) => {
                setPickerOpen(false);
                const selectedEvents = referredEvents
                  .map((eventIndex) => dayEvents?.[eventIndex])
                  .filter((event): event is DayEvent => Boolean(event))
                  .map(toReferredEvent)

                sendMessage({
                  text,
                  metadata:
                    selectedEvents.length > 0
                      ? { referredEvents: selectedEvents }
                      : undefined,
                });
                setReferredEvents([]);
              }}
            >
              <PromptInputTextarea
                placeholder="Ask about your calendar… (# to reference an event)"
                autoComplete="off"
                spellCheck={false}
                className="min-h-[38px]"
                onKeyDown={handleTextareaKeyDown}
              />
              <PromptInputSubmit status={status} onStop={chat.stop} />
            </PromptInput>
          </PopoverAnchor>
          <PopoverContent
            side="top"
            align="start"
            className="w-(--radix-popover-trigger-width) p-0"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandInput autoFocus placeholder="Search events…" />
              <CommandList>
                <CommandGroup heading="Reference an event">
                  {dayEvents?.map((event, i) => {
                    const time = eventTimeLabel(event);
                    const alreadyAdded = referredEvents.includes(i);
                    return (
                      <CommandItem
                        key={event.id ?? i}
                        value={event.title}
                        disabled={alreadyAdded}
                        onSelect={() => addReferredEvent(i)}
                      >
                        <CalendarDays className="text-muted-foreground" />
                        <span className="min-w-0 truncate">{event.title}</span>
                        {time && (
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {time}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandEmpty>No events today.</CommandEmpty>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/50">
          AI can make mistakes. Verify important details.
        </p>
      </div>
    </div>
  );
}
