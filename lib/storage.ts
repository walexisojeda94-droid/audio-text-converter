"use client"

import type { Book, HistoryItem, Settings } from "./types"
import { DEFAULT_SETTINGS } from "./types"

const HISTORY_KEY = "timbre.history.v1"
const SETTINGS_KEY = "timbre.settings.v1"
const BOOKS_KEY = "timbre.books.v1"

/* ----------------------------- Settings ----------------------------- */

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

/* ----------------------------- History ----------------------------- */

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as HistoryItem[]
    return items.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export function persistHistory(items: HistoryItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
}

/* ------------------------------ Books ------------------------------- */

export function loadBooks(): Book[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(BOOKS_KEY)
    if (!raw) return []
    const items = JSON.parse(raw) as Book[]
    return items.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export function persistBooks(items: Book[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(BOOKS_KEY, JSON.stringify(items))
  } catch {
    // Storage quota exceeded (large book) — fail silently, book stays in memory only.
  }
}

/* --------------------- Audio blobs (IndexedDB) --------------------- */

const DB_NAME = "timbre-audio"
const STORE = "clips"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putAudio(id: string, blob: Blob): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAudio(id: string): Promise<Blob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as Blob) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteAudio(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAllAudio(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
