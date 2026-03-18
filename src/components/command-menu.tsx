"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { addDays, subDays } from "date-fns"
import {
  CalendarDays,
  CalendarCheck,
  CalendarMinus,
  MessageCircle,
  Palette,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
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
import { useColorTheme, colorThemes } from "@/hooks/use-color-theme"
import { authClient } from "@/auth-client"

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? "⌘" : "Ctrl+"

type Page = "root" | "theme"

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
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Menu"
    >
      {open ? (
        <CommandMenuContent
          onSelectDate={onSelectDate}
          onRun={run}
          routerPush={router.push}
          toggleChat={toggleChat}
        />
      ) : null}
    </CommandDialog>
  )
}

type CommandMenuContentProps = {
  onSelectDate: (date: Date) => void
  onRun: (action: () => void) => void
  routerPush: ReturnType<typeof useRouter>["push"]
  toggleChat: () => void
}

function CommandMenuContent({
  onSelectDate,
  onRun,
  routerPush,
  toggleChat,
}: CommandMenuContentProps) {
  const [page, setPage] = useState<Page>("root")
  const [search, setSearch] = useState("")
  const { resolvedTheme, setTheme: setMode } = useTheme()
  const { theme: colorTheme, applyTheme } = useColorTheme()
  const isDark = resolvedTheme === "dark"

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !search && page !== "root") {
      e.preventDefault()
      setPage("root")
    }
  }

  return (
    <Command onKeyDown={handleKeyDown}>
      <CommandInput
        placeholder={page === "theme" ? "Search themes..." : "Type a command..."}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {page === "root" ? (
          <>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => onRun(() => onSelectDate(new Date()))}>
                <CalendarCheck />
                Go to Today
              </CommandItem>
              <CommandItem onSelect={() => onRun(() => onSelectDate(addDays(new Date(), 1)))}>
                <CalendarDays />
                Go to Tomorrow
              </CommandItem>
              <CommandItem onSelect={() => onRun(() => onSelectDate(subDays(new Date(), 1)))}>
                <CalendarMinus />
                Go to Yesterday
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Assistant">
              <CommandItem onSelect={() => onRun(toggleChat)}>
                <MessageCircle />
                Toggle Assistant
                <CommandShortcut>{mod}I</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Settings">
              <CommandItem onSelect={() => onRun(() => setMode(isDark ? "light" : "dark"))}>
                {isDark ? <Sun /> : <Moon />}
                {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </CommandItem>
              <CommandItem onSelect={() => { setPage("theme"); setSearch("") }}>
                <Palette />
                Change Theme
                <CommandShortcut><ChevronRight className="size-3.5" /></CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Account">
              <CommandItem
                onSelect={() => onRun(() =>
                  authClient.signOut({ fetchOptions: { onSuccess: () => routerPush("/") } })
                )}
              >
                <LogOut />
                Sign Out
              </CommandItem>
            </CommandGroup>
          </>
        ) : (
          <CommandGroup heading="Theme">
            {colorThemes.map((t) => (
              <CommandItem key={t.id} onSelect={() => onRun(() => applyTheme(t.id))}>
                <span
                  className="size-3.5 rounded-full border border-border/50 shrink-0"
                  style={{ background: t.color }}
                />
                {t.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}
