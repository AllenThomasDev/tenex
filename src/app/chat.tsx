"use client";

import { getToolName, isToolUIPart } from "ai";
import { format, parseISO } from "date-fns";
import { CalendarDays, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useSWRConfig } from "swr";

import {
  type DayEvent,
  fetchDayEvents,
  fetchFreshDayEvents,
} from "@/hooks/use-day-events";

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
import { Shimmer } from "@/components/ai-elements/shimmer";
import { getStatusBadge } from "@/components/ai-elements/tool";

type ChatProps = {
  dayKey?: string | null;
};

const DAY_MUTATION_TOOLS = new Set([
  "createEvent",
  "updateEvent",
  "deleteEvent",
  "respondToEvent",
]);

function getAffectedDayKeys(output: unknown) {
  if (
    output &&
    typeof output === "object" &&
    "affectedDayKeys" in output &&
    Array.isArray((output as { affectedDayKeys?: unknown }).affectedDayKeys)
  ) {
    return (output as { affectedDayKeys: unknown[] }).affectedDayKeys.filter(
      (key): key is string => typeof key === "string" && key.length > 0,
    );
  }

  return [];
}

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

const TOOL_TITLES: Record<string, string> = {
  listCalendars: "List calendars",
  listEvents: "List events",
  getEvent: "Get event",
  searchEvents: "Search events",
  createEvent: "Create event",
  updateEvent: "Update event",
  deleteEvent: "Delete event",
  respondToEvent: "Respond to event",
  getFreeBusy: "Check availability",
  listColors: "List colors",
};

const EXAMPLE_PROMPTS = [
  {
    label: "Multi-step planning",
    prompt:
      "I have three meetings I need to schedule with Joe, Dan, and Sally. I really want to block my mornings off to work out, so can you write me an email draft I can share with each of them?",
  },
  {
    label: "Schedule review",
    prompt:
      "Show me all my meetings longer than an hour this week.",
  },
  {
    label: "Availability + scheduling",
    prompt:
      "Show me my availability tomorrow afternoon and find a good 30-minute slot for coffee with Sarah.",
  },
];

export function Chat({ dayKey }: ChatProps) {
  const { chat, selectedEventIds, toggleEventId, clearSelectedEvents } = useChatPanel();
  const { messages, sendMessage, setMessages, status } = chat;
  const { mutate } = useSWRConfig();
  const { data: dayEvents } = useSWR<DayEvent[]>(dayKey ?? null, fetchDayEvents);
  const refreshedToolCallIdsRef = useRef(new Set<string>());
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isStreaming = status === "submitted" || status === "streaming";

  const getTextarea = useCallback(
    () => inputContainerRef.current?.querySelector("textarea") ?? null,
    [],
  );

  const handlePickerSelect = useCallback(
    (eventId: string) => {
      toggleEventId(eventId);
      getTextarea()?.focus();
      setPickerOpen(false);
    },
    [toggleEventId, getTextarea],
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "#" || !dayEvents?.length) return;

      e.preventDefault();
      setPickerOpen(true);
    },
    [dayEvents],
  );

  useEffect(() => {
    const dayKeysToRefresh = new Set<string>();

    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part) || part.state !== "output-available") continue;

        const toolName = getToolName(part);
        if (!DAY_MUTATION_TOOLS.has(toolName)) continue;
        if (refreshedToolCallIdsRef.current.has(part.toolCallId)) continue;

        refreshedToolCallIdsRef.current.add(part.toolCallId);
        for (const affectedDayKey of getAffectedDayKeys(part.output)) {
          dayKeysToRefresh.add(affectedDayKey);
        }
      }
    }

    if (dayKeysToRefresh.size > 0) {
      void Promise.all(
        Array.from(dayKeysToRefresh, (affectedDayKey) =>
          mutate(affectedDayKey, fetchFreshDayEvents(affectedDayKey), {
            revalidate: false,
          }),
        ),
      );
    }
  }, [messages, mutate]);

  const handleClearChat = useCallback(() => {
    chat.stop();
    setMessages([]);
    clearSelectedEvents();
  }, [chat, setMessages, clearSelectedEvents]);

  const handleExamplePrompt = useCallback(
    (text: string) => {
      sendMessage({ text });
      clearSelectedEvents();
    },
    [sendMessage, clearSelectedEvents],
  );

  // Build the list of selected DayEvent objects for display
  const selectedDayEvents = dayEvents
    ? selectedEventIds
        .map((id) => dayEvents.find((e) => e.id === id))
        .filter((e): e is DayEvent => Boolean(e))
    : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium text-foreground">Chat</span>
        <button
          type="button"
          onClick={handleClearChat}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Clear
        </button>
      </div>
      <Conversation className="flex-1">
        <ConversationContent scrollClassName="no-scrollbar" className="gap-3 p-4">
          {messages.length === 0 && (
            <ConversationEmptyState
              icon={
                <span className="[&>svg]:size-8">{assistant.icon}</span>
              }
              title={assistant.name}
              description={assistant.tagline}
            >
              <div className="flex w-full max-w-xl flex-col items-center gap-3">
                <div className="text-muted-foreground text-sm">Try asking:</div>
                <div className="grid w-full gap-2">
                  {EXAMPLE_PROMPTS.map((example) => (
                    <button
                      key={example.label}
                      type="button"
                      onClick={() => handleExamplePrompt(example.prompt)}
                      className="rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {example.label}
                      </div>
                      <div className="text-sm text-foreground">{example.prompt}</div>
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
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
                  if (!isToolUIPart(part)) return null;

                  const toolName = getToolName(part);
                  const isComplete = part.state === "output-available";

                  // Display tools — render custom UI when complete
                  if (toolName === "displayEvents") {
                    if (isComplete && Array.isArray(part.output)) {
                      return <ChatEventList key={i} events={part.output} />;
                    }
                  } else if (toolName === "displayFreeBusy") {
                    if (isComplete && part.output) {
                      return <ChatFreeBusy key={i} data={part.output as FreeBusyData} />;
                    }
                  } else if (toolName === "displayEmailDraft") {
                    if (isComplete && part.output) {
                      return <ChatEmailDraft key={i} draft={part.output as EmailDraftData} />;
                    }
                  } else if (toolName === "displayContacts") {
                    if (isComplete && part.output) {
                      return <ChatContactResults key={i} data={part.output as ContactSearchResponse} />;
                    }
                  }

                  // All tools (including display tools while loading)
                  return (
                    <div key={i} className="flex items-center gap-2 rounded-md border p-2.5">
                      <span className="text-sm font-medium">{TOOL_TITLES[toolName] ?? toolName}</span>
                      {getStatusBadge(part.state)}
                    </div>
                  );
                })}
              </MessageContent>
            </Message>
            );
          })}

          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer className="text-sm text-muted-foreground">Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Pinned input */}
      <div ref={inputContainerRef} className="shrink-0 p-3">
        {selectedDayEvents.length > 0 ? (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {selectedDayEvents.map((event) => {
              return (
                <span
                  key={event.id}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  <CalendarDays className="size-3" />
                  {event.title}
                  <button
                    type="button"
                    className="ml-0.5 rounded-sm hover:bg-primary/20"
                    onClick={() => toggleEventId(event.id!)}
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
                const referredEvents = selectedDayEvents.map(toReferredEvent);

                sendMessage({
                  text,
                  metadata:
                    referredEvents.length > 0
                      ? { referredEvents }
                      : undefined,
                });
                clearSelectedEvents();
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
                  {dayEvents?.map((event) => {
                    if (!event.id) return null;
                    const time = eventTimeLabel(event);
                    const alreadyAdded = selectedEventIds.includes(event.id);
                    return (
                      <CommandItem
                        key={event.id}
                        value={event.title}
                        disabled={alreadyAdded}
                        onSelect={() => handlePickerSelect(event.id!)}
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
