"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { addDays, format, subDays } from "date-fns"
import { parseDate } from "chrono-node"
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
import { authClient } from "@/auth-client"

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? "⌘" : "Ctrl+"

const colorThemes = [
  { id: "default",    label: "Default",    color: "oklch(0.205 0 0)" },
  { id: "catppuccin", label: "Catppuccin", color: "oklch(0.5547 0.2503 297.0156)" },
  { id: "yellow",     label: "Yellow",     color: "oklch(0.852 0.199 91.936)" },
] as const

type ColorThemeId = (typeof colorThemes)[number]["id"]

function parseTheme(theme: string | undefined) {
  if (!theme) return { isDark: true, colorTheme: "default" as ColorThemeId }
  const isDark = theme === "dark" || theme.startsWith("dark-")
  const colorTheme = theme.replace(/^(dark|light)-?/, "") || "default"
  return { isDark, colorTheme: colorTheme as ColorThemeId }
}

function buildTheme(isDark: boolean, colorTheme: ColorThemeId) {
  if (colorTheme === "default") return isDark ? "dark" : "light"
  return isDark ? `dark-${colorTheme}` : colorTheme
}

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
  const { theme, setTheme } = useTheme()
  const { isDark, colorTheme } = parseTheme(theme)
  const trimmedSearch = search.trim()
  const parsedSearchDate =
    page === "root" && trimmedSearch
      ? parseDate(trimmedSearch, new Date(), { forwardDate: true })
      : null

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
        <CommandEmpty>
          {page === "root" && trimmedSearch
            ? 'Try a date like "December 12" or "next Friday".'
            : "No results found."}
        </CommandEmpty>

        {page === "root" ? (
          <>
            {parsedSearchDate ? (
              <>
                <CommandGroup heading="Jump to Date">
                  <CommandItem
                    value={trimmedSearch}
                    onSelect={() => onRun(() => onSelectDate(parsedSearchDate))}
                  >
                    <CalendarDays />
                    Go to {format(parsedSearchDate, "EEEE, MMMM d")}
                  </CommandItem>
                </CommandGroup>

                <CommandSeparator />
              </>
            ) : null}

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
              <CommandItem onSelect={() => onRun(() => setTheme(buildTheme(!isDark, colorTheme)))}>
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
              <CommandItem key={t.id} onSelect={() => onRun(() => setTheme(buildTheme(isDark, t.id)))}>
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
