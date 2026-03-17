"use client";

import { useChat } from "@ai-sdk/react";
import { getToolName, isToolUIPart } from "ai";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";

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
    return "Loading calendar events...";
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

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!dayKey) {
      return;
    }

    let shouldRefreshDay = false;

    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part) || part.state !== "output-available") {
          continue;
        }

        const toolName = getToolName(part);

        if (!DAY_MUTATION_TOOLS.has(toolName)) {
          continue;
        }

        if (refreshedToolCallIdsRef.current.has(part.toolCallId)) {
          continue;
        }

        refreshedToolCallIdsRef.current.add(part.toolCallId);
        shouldRefreshDay = true;
      }
    }

    if (shouldRefreshDay) {
      void mutate(dayKey);
    }
  }, [dayKey, messages, mutate]);

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-3 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg px-4 py-3 ${
              message.role === "user"
                ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                : "self-start bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            }`}
          >
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <p key={i} className="whitespace-pre-wrap">
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
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your calendar…"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          Send
        </button>
      </form>
    </div>
  );
}
