type EventContextLike = {
  id?: string
  title: string
  start?: string
}

export function getEventContextKey(event: EventContextLike): string {
  return event.id ?? `${event.title}::${event.start ?? "unknown"}`
}
