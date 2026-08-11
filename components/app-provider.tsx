"use client"

import * as React from "react"
import type { Book, HistoryItem, Settings } from "@/lib/types"
import { DEFAULT_SETTINGS } from "@/lib/types"
import {
  clearAllAudio,
  deleteAudio,
  loadBooks,
  loadHistory,
  loadSettings,
  persistBooks,
  persistHistory,
  putAudio,
  saveSettings,
} from "@/lib/storage"

interface AppContextValue {
  ready: boolean
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  history: HistoryItem[]
  addHistory: (item: HistoryItem, audio?: Blob) => Promise<void>
  removeHistory: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  books: Book[]
  addBook: (book: Book) => void
  updateBookProgress: (id: string, progress: number) => void
  removeBook: (id: string) => void
}

const AppContext = React.createContext<AppContextValue | null>(null)

export function useApp() {
  const ctx = React.useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  if (theme === "light") root.classList.add("light")
  else if (theme === "dark") root.classList.add("dark")
  // "system" => no class, relies on media query
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false)
  const [settings, setSettings] = React.useState<Settings>(DEFAULT_SETTINGS)
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [books, setBooks] = React.useState<Book[]>([])

  React.useEffect(() => {
    const s = loadSettings()
    setSettings(s)
    applyTheme(s.theme)
    setHistory(loadHistory())
    setBooks(loadBooks())
    setReady(true)
  }, [])

  const updateSettings = React.useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      if (patch.theme && patch.theme !== prev.theme) applyTheme(patch.theme)
      return next
    })
  }, [])

  const addHistory = React.useCallback(
    async (item: HistoryItem, audio?: Blob) => {
      if (audio && item.hasAudio) {
        try {
          await putAudio(item.id, audio)
        } catch {
          item.hasAudio = false
        }
      }
      setHistory((prev) => {
        const next = [item, ...prev]
        persistHistory(next)
        return next
      })
    },
    [],
  )

  const removeHistory = React.useCallback(async (id: string) => {
    await deleteAudio(id).catch(() => {})
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id)
      persistHistory(next)
      return next
    })
  }, [])

  const clearHistory = React.useCallback(async () => {
    await clearAllAudio().catch(() => {})
    setHistory([])
    persistHistory([])
  }, [])

  const addBook = React.useCallback((book: Book) => {
    setBooks((prev) => {
      const next = [book, ...prev]
      persistBooks(next)
      return next
    })
  }, [])

  const updateBookProgress = React.useCallback((id: string, progress: number) => {
    setBooks((prev) => {
      const next = prev.map((b) =>
        b.id === id ? { ...b, progress, updatedAt: Date.now() } : b,
      )
      persistBooks(next)
      return next
    })
  }, [])

  const removeBook = React.useCallback((id: string) => {
    setBooks((prev) => {
      const next = prev.filter((b) => b.id !== id)
      persistBooks(next)
      return next
    })
  }, [])

  const value: AppContextValue = {
    ready,
    settings,
    updateSettings,
    history,
    addHistory,
    removeHistory,
    clearHistory,
    books,
    addBook,
    updateBookProgress,
    removeBook,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
