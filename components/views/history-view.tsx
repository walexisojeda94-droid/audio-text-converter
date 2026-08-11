"use client"

import * as React from "react"
import {
  Check,
  Copy,
  Download,
  Mic,
  Pause,
  Play,
  Search,
  Trash2,
  Type,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/components/app-provider"
import { getAudio } from "@/lib/storage"
import { formatDuration, formatRelativeTime } from "@/lib/format"
import type { ConversionType, HistoryItem } from "@/lib/types"
import { Header } from "./text-to-audio"
import { cn } from "@/lib/utils"

type Filter = "all" | ConversionType

export function HistoryView({
  onNavigate,
}: {
  onNavigate: (v: "text-to-audio" | "audio-to-text") => void
}) {
  const { history, removeHistory, clearHistory } = useApp()
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [playingId, setPlayingId] = React.useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const filtered = history.filter((h) => {
    const matchesFilter = filter === "all" || h.type === filter
    const matchesQuery =
      !query || h.text.toLowerCase().includes(query.toLowerCase())
    return matchesFilter && matchesQuery
  })

  const stopPlayback = React.useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingId(null)
  }, [])

  React.useEffect(() => stopPlayback, [stopPlayback])

  const play = async (item: HistoryItem) => {
    if (playingId === item.id) {
      stopPlayback()
      return
    }
    stopPlayback()

    if (item.type === "audio-to-text" && item.hasAudio) {
      const blob = await getAudio(item.id)
      if (blob) {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => {
          URL.revokeObjectURL(url)
          setPlayingId(null)
        }
        audioRef.current = audio
        audio.play()
        setPlayingId(item.id)
        return
      }
    }

    // Fallback / TTS items: re-synthesize the text.
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(item.text)
      if (item.meta?.rate) u.rate = item.meta.rate
      if (item.meta?.pitch) u.pitch = item.meta.pitch
      if (item.meta?.volume != null) u.volume = item.meta.volume
      if (item.meta?.lang) u.lang = item.meta.lang
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.name === item.meta?.voice)
      if (voice) u.voice = voice
      u.onend = () => setPlayingId(null)
      u.onerror = () => setPlayingId(null)
      window.speechSynthesis.speak(u)
      setPlayingId(item.id)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <Header
          eyebrow="History"
          title="Your conversion library"
          subtitle="Everything you've saved, stored privately in this browser. Play it back, copy the text, or download the audio."
        />
        {history.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => {
              stopPlayback()
              clearHistory()
            }}
            className="mt-1 shrink-0 gap-2 text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </Button>
        )}
      </div>

      {/* Search + filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcripts and text…"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex rounded-lg border border-border bg-card p-1">
          {(
            [
              ["all", "All"],
              ["text-to-audio", "Speech"],
              ["audio-to-text", "Text"],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasAny={history.length > 0} onNavigate={onNavigate} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              playing={playingId === item.id}
              onPlay={() => play(item)}
              onDelete={() => {
                if (playingId === item.id) stopPlayback()
                removeHistory(item.id)
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function HistoryCard({
  item,
  playing,
  onPlay,
  onDelete,
}: {
  item: HistoryItem
  playing: boolean
  onPlay: () => void
  onDelete: () => void
}) {
  const [copied, setCopied] = React.useState(false)
  const isTTS = item.type === "text-to-audio"

  const copy = async () => {
    await navigator.clipboard.writeText(item.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = async () => {
    if (item.hasAudio) {
      const blob = await getAudio(item.id)
      if (blob) {
        triggerDownload(blob, `${item.title.slice(0, 24) || "recording"}.webm`)
        return
      }
    }
    triggerDownload(
      new Blob([item.text], { type: "text/plain" }),
      `${item.title.slice(0, 24) || "text"}.txt`,
    )
  }

  return (
    <li className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isTTS
              ? "bg-primary/10 text-primary"
              : "bg-accent text-accent-foreground",
          )}
        >
          {isTTS ? <Type className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isTTS ? "Text to Audio" : "Audio to Text"}
            </span>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-foreground">
            {item.text}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{item.wordCount} words</span>
            {item.durationSec != null && (
              <span>{formatDuration(item.durationSec)}</span>
            )}
            {item.meta?.voice && <span>{item.meta.voice}</span>}
            {item.meta?.lang && !item.meta?.voice && (
              <span>{item.meta.lang}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
        <Button
          size="sm"
          variant={playing ? "secondary" : "outline"}
          onClick={onPlay}
          className="h-8 gap-1.5"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          {playing ? "Playing" : "Play"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={copy}
          className="h-8 gap-1.5 text-muted-foreground"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={download}
          className="h-8 gap-1.5 text-muted-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          {item.hasAudio ? "Audio" : "Text"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="ml-auto h-8 gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  )
}

function EmptyState({
  hasAny,
  onNavigate,
}: {
  hasAny: boolean
  onNavigate: (v: "text-to-audio" | "audio-to-text") => void
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">
        {hasAny ? "No matching items" : "Nothing saved yet"}
      </p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
        {hasAny
          ? "Try a different search or filter."
          : "Convert some text or record your voice, then save it to build your library."}
      </p>
      {!hasAny && (
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => onNavigate("text-to-audio")} className="gap-2">
            <Type className="h-4 w-4" />
            Text to Audio
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate("audio-to-text")}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Audio to Text
          </Button>
        </div>
      )}
    </div>
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
