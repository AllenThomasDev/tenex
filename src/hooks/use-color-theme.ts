"use client"

import { useLayoutEffect, useState } from "react"

const THEME_KEY = "color-theme"

export const colorThemes = [
  { id: "default",    label: "Default",    color: "oklch(0.205 0 0)" },
  { id: "catppuccin", label: "Catppuccin", color: "oklch(0.5547 0.2503 297.0156)" },
  { id: "yellow",     label: "Yellow",     color: "oklch(0.852 0.199 91.936)" },
] as const

export type ColorThemeId = (typeof colorThemes)[number]["id"]

export function useColorTheme() {
  const [theme, setTheme] = useState<ColorThemeId>(() => {
    if (typeof window === "undefined") return "default"

    const saved = localStorage.getItem(THEME_KEY) as ColorThemeId | null
    return saved && colorThemes.some((t) => t.id === saved) ? saved : "default"
  })

  useLayoutEffect(() => {
    if (theme === "default") {
      document.documentElement.removeAttribute("data-theme")
    } else {
      document.documentElement.setAttribute("data-theme", theme)
    }
  }, [theme])

  function applyTheme(id: ColorThemeId) {
    localStorage.setItem(THEME_KEY, id)
    setTheme(id)
  }

  return { theme, applyTheme }
}
