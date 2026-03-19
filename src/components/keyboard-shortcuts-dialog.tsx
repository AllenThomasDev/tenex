"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? "⌘" : "Ctrl+"

const shortcutGroups = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["h"], description: "Previous day" },
      { keys: ["l"], description: "Next day" },
      { keys: [mod + "K"], description: "Command menu" },
    ],
  },
  {
    label: "Assistant",
    shortcuts: [
      { keys: [mod + "I"], description: "Toggle chat panel" },
      { keys: ["#"], description: "Reference an event in chat" },
    ],
  },
] as const

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground [font-family:var(--font-geist-mono)]">
      {children}
    </kbd>
  )
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return

      if (e.key === "?") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {shortcutGroups.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-geist-mono)]">
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-[13px] text-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/60 text-center [font-family:var(--font-geist-mono)]">
          Press <Kbd>?</Kbd> to toggle this dialog
        </p>
      </DialogContent>
    </Dialog>
  )
}
