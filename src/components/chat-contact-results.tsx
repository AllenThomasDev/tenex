"use client"

import { ContactRound, Mail, Phone, Search, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { ContactSearchResponse } from "@/lib/tools/google-contacts"

function ContactCard({
  contact,
  index,
}: {
  contact: ContactSearchResponse["results"][number]
  index: number
}) {
  const canInvite = Boolean(contact.email)

  return (
    <div
      className={[
        "rounded-xl border px-3 py-3 transition-colors",
        canInvite
          ? "border-border/60 bg-background/60"
          : "border-border/40 bg-muted/20 text-muted-foreground",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ContactRound className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {contact.name ?? "Unnamed contact"}
            </p>
            {index === 0 && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Sparkles className="size-2.5" />
                Best match
              </Badge>
            )}
            <Badge variant={canInvite ? "default" : "outline"} className="text-[10px]">
              {canInvite ? "Can invite" : "No email"}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs">
            {contact.email ? (
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="size-3 text-muted-foreground" />
                <span className="truncate">{contact.email}</span>
              </div>
            ) : null}

            {contact.phoneNumber ? (
              <div className="flex items-center gap-2">
                <Phone className="size-3 text-muted-foreground" />
                <span className="truncate">{contact.phoneNumber}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChatContactResults({
  data,
}: {
  data: ContactSearchResponse
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Search className="size-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">
          {data.results.length} match{data.results.length === 1 ? "" : "es"} for &quot;{data.query}&quot;
        </span>
      </div>

      {data.results.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-3 text-sm text-muted-foreground">
          <ContactRound className="size-4" />
          No matching contacts found
        </div>
      ) : (
        <div className="space-y-2">
          {data.results.map((contact, index) => (
            <ContactCard
              key={`${contact.resourceName}-${contact.email ?? contact.phoneNumber ?? index}`}
              contact={contact}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}
