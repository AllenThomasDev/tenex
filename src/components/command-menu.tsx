"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { addDays, subDays } from "date-fns"
import {
  CalendarDays,
  CalendarCheck,
  CalendarMinus,
  MessageCircle,
  Palette,
  LogOut,
} from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useChatPanel } from "@/components/chat-provider"
import { authClient } from "@/auth-client"

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? "⌘" : "Ctrl+"

const themes = [
  { id: "default",    label: "Default",    color: "oklch(0.205 0 0)" },
  { id: "catppuccin", label: "Catppuccin", color: "oklch(0.5547 0.2503 297.0156)" },
  { id: "yellow",     label: "Yellow",     color: "oklch(0.852 0.199 91.936)" },
] as const

type ThemeId = (typeof themes)[number]["id"]

const THEME_KEY = "color-theme"

function applyTheme(id: ThemeId) {
  if (id === "default") {
    document.documentElement.removeAttribute("data-theme")
  } else {
    document.documentElement.setAttribute("data-theme", id)
  }
  localStorage.setItem(THEME_KEY, id)
}

type CommandMenuProps = {
  onSelectDate: (date: Date) => void
}

export function CommandMenu({ onSelectDate }: CommandMenuProps) {
  const [open, setOpen] = useState(false)
  const { toggleChat } = useChatPanel()
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command Menu">
      <Command>
      <CommandInput placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => run(() => onSelectDate(new Date()))}>
            <CalendarCheck />
            Go to Today
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => onSelectDate(addDays(new Date(), 1)))}>
            <CalendarDays />
            Go to Tomorrow
          </CommandItem>
          <CommandItem onSelect={() => run(() => onSelectDate(subDays(new Date(), 1)))}>
            <CalendarMinus />
            Go to Yesterday
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Assistant">
          <CommandItem onSelect={() => run(toggleChat)}>
            <MessageCircle />
            Toggle Assistant
            <CommandShortcut>{mod}I</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          {themes.map((t) => (
            <CommandItem key={t.id} onSelect={() => run(() => applyTheme(t.id))}>
              <span
                className="size-3.5 rounded-full border border-border/50 shrink-0"
                style={{ background: t.color }}
              />
              {t.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem
            onSelect={() => run(() =>
              authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })
            )}
          >
            <LogOut />
            Sign Out
          </CommandItem>
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  )
}
