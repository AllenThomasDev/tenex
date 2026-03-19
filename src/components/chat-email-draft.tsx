"use client"

import { useState } from "react"
import { Check, Copy, ExternalLink, Mail } from "lucide-react"

export type EmailDraftData = {
  to: string[]
  subject: string
  body: string
  cc?: string[]
}

function buildGmailUrl(draft: EmailDraftData) {
  const params = new URLSearchParams()
  params.set("view", "cm")
  params.set("to", draft.to.join(","))
  params.set("su", draft.subject)
  params.set("body", draft.body)
  if (draft.cc?.length) params.set("cc", draft.cc.join(","))
  return `https://mail.google.com/mail/?${params.toString()}`
}

export function ChatEmailDraft({ draft }: { draft: EmailDraftData }) {
  const [copied, setCopied] = useState(false)

  function copyBody() {
    navigator.clipboard.writeText(draft.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-border/50 bg-background/50 overflow-hidden">
      {/* Header */}
      <div className="space-y-1.5 border-b border-border/40 px-3 py-2.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground w-8 shrink-0">To</span>
          <span className="text-foreground truncate">{draft.to.join(", ")}</span>
        </div>
        {draft.cc && draft.cc.length > 0 && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground w-8 shrink-0">Cc</span>
            <span className="text-foreground truncate">{draft.cc.join(", ")}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground w-8 shrink-0">Sub</span>
          <span className="font-medium text-foreground truncate">{draft.subject}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
          {draft.body}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border/40 px-3 py-2">
        <a
          href={buildGmailUrl(draft)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Mail className="size-3" />
          Open in Gmail
          <ExternalLink className="size-2.5" />
        </a>
        <button
          type="button"
          onClick={copyBody}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy body"}
        </button>
      </div>
    </div>
  )
}
