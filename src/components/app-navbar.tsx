"use client"

import { CalendarDays, LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { authClient } from "@/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useChatPanel } from "@/components/chat-provider"
import { assistant } from "@/lib/assistant"

type AppNavbarProps = {
  user: {
    name?: string | null
    email: string
    image?: string | null
  } | null
}

export function AppNavbar({ user }: AppNavbarProps) {
  const { state, toggleChat } = useChatPanel()
  const router = useRouter()

  const displayName = user?.name?.trim() || user?.email || ""
  const fallback = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/")
          router.refresh()
        },
      },
    })
  }

  return (
    <header className="fixed top-0 z-10 h-10 w-full border-b border-border bg-background/95 backdrop-blur-lg">
      <nav className="flex h-full w-full items-center justify-between px-4">
        {/* Wordmark */}
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-foreground/60" />
          <span className="text-sm font-medium tracking-tight text-foreground">
            tenex
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Assistant toggle */}
          <button
            type="button"
            onClick={toggleChat}
            title={`${assistant.name} (⌘I)`}
            className={cn(
              "relative flex h-7 w-7 items-center justify-center rounded-md",
              "cursor-pointer transition-all duration-200",
              "text-muted-foreground/60 hover:text-foreground hover:bg-accent/60",
              state.isOpen && "bg-accent/60 text-foreground",
            )}
          >
            <span className="[&>svg]:h-4 [&>svg]:w-4">{assistant.icon}</span>
            {state.isWorking && (
              <span className="absolute inset-0 rounded-md border border-foreground/20 animate-ping" />
            )}
          </button>

          {/* User avatar */}
          {user ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-full p-1 outline-none transition-opacity hover:opacity-80"
                  title={displayName ? `Signed in as ${displayName}` : "Account"}
                >
                  <Avatar className="h-6 w-6 rounded-full border border-border/60">
                    <AvatarImage src={user.image ?? undefined} alt={displayName} />
                    <AvatarFallback className="rounded-full text-[10px]">{fallback}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-0">
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/30">
                    <Avatar className="h-8 w-8 shrink-0 rounded-full border border-border/40">
                      <AvatarImage src={user.image ?? undefined} alt={displayName} />
                      <AvatarFallback className="rounded-full text-xs">{fallback}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {user.name && (
                        <span className="truncate text-[12px] font-medium leading-tight">
                          {user.name}
                        </span>
                      )}
                      <span className="truncate text-[11px] text-muted-foreground leading-tight">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-0" />
                <div className="p-1">
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="h-7 gap-2 text-[11px] text-destructive focus:text-destructive"
                  >
                    <LogOutIcon className="h-3.5 w-3.5" />
                    Sign out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </nav>
    </header>
  )
}
