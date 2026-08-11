export function formatDuration(seconds?: number): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return "--:--"
  const s = Math.round(seconds)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${rem.toString().padStart(2, "0")}`
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} day${day > 1 ? "s" : ""} ago`
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function countWords(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

export function makeTitle(text: string, max = 60): string {
  const t = text.trim().replace(/\s+/g, " ")
  if (!t) return "Untitled"
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
