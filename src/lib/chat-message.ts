import type { CalendarAgentUIMessage } from "@/lib/agents/calendar-agent"

export type ReferredCalendarEvent = {
  id?: string
  title: string
  start?: string
  end?: string
  isAllDay: boolean
  location?: string
}

export type ChatMessageMetadata = {
  referredEvents?: ReferredCalendarEvent[]
}

export type CalendarChatMessage = CalendarAgentUIMessage & {
  metadata?: ChatMessageMetadata
}
