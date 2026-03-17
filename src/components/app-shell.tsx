"use client"

import * as React from "react"
import { format } from "date-fns"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Chat } from "@/app/chat"

type AppShellProps = {
  user: {
    name?: string | null
    email: string
    image?: string | null
  } | null
}

export function AppShell({ user }: AppShellProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    () => new Date()
  )
  const [dateMotion, setDateMotion] = React.useState<"left" | "right">("left")

  function handleSelectDate(date: Date | undefined) {
    const nextDate = date ?? new Date()

    if (selectedDate) {
      setDateMotion(nextDate > selectedDate ? "right" : "left")
    }

    setSelectedDate(nextDate)
  }

  return (
    <SidebarProvider>
      {user ? (
        <AppSidebar
          user={user}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
      ) : null}
      <SidebarInset>
        <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
          <main className="flex w-full justify-center px-6 py-10">
            {user ? (
              <div className="flex w-full max-w-4xl flex-col gap-8">
                {selectedDate ? (
                  <h1
                    key={selectedDate.toISOString()}
                    className={`animate-in fade-in duration-400 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 ${
                      dateMotion === "right"
                        ? "slide-in-from-right-6"
                        : "slide-in-from-left-6"
                    }`}
                  >
                    {format(selectedDate, "EEEE MMMM d, yyyy")}
                  </h1>
                ) : null}
                <Chat />
              </div>
            ) : null}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
