"use client"

import * as React from "react"

type Theme = "light" | "dark"

const ThemeContext = React.createContext<{
  theme: Theme
  toggle: () => void
}>({ theme: "light", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("light")

  // On mount: read localStorage, fall back to system preference
  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initial: Theme = stored ?? (systemDark ? "dark" : "light")
    setTheme(initial)
    document.documentElement.classList.toggle("dark", initial === "dark")
  }, [])

  // Follow system preference changes when no manual override is stored
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const next: Theme = e.matches ? "dark" : "light"
        setTheme(next)
        document.documentElement.classList.toggle("dark", e.matches)
      }
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  function toggle() {
    setTheme(prev => {
      const next: Theme = prev === "dark" ? "light" : "dark"
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return React.useContext(ThemeContext)
}
