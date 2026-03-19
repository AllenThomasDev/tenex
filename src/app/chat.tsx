"use client";

import { getToolName, isToolUIPart } from "ai";
import { useEffect, useRef } from "react";
import { useSWRConfig } from "swr";

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
  const refreshedToolCallIdsRef = useRef(new Set<string>());

  const isStreaming = status === "submitted" || status === "streaming";

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
      <div className="shrink-0 p-3">
        <PromptInput
          onSubmit={({ text }) => {
            sendMessage({ text });
          }}
        >
          <PromptInputTextarea
            placeholder="Ask about your calendar…"
            autoComplete="off"
            spellCheck={false}
            className="min-h-[38px]"
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
