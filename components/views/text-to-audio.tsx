"use client"

import * as React from "react"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Library,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Waveform } from "@/components/waveform"
import { useApp } from "@/components/app-provider"
import { languageLabel, useVoices } from "@/lib/use-voices"
import { countWords, uid } from "@/lib/format"
import { detectExt, extractBook } from "@/lib/extract-text"
import type { Book } from "@/lib/types"

const SAMPLE_PARAGRAPHS = [
  "Hola — soy Timbre. Sube un libro en PDF, Word o EPUB y te lo leo en voz alta, o simplemente escribe o pega tu texto aquí abajo.",
  "Ajusta la velocidad y la voz a tu gusto, y yo recuerdo dónde te quedaste cada vez que vuelvas.",
]

export function TextToAudio() {
  const { settings, updateSettings, books, addBook, updateBookProgress, removeBook } =
    useApp()
  const { voices, supported } = useVoices()

  const [activeBook, setActiveBook] = React.useState<Book | null>(null)
  const [paragraphs, setParagraphs] = React.useState<string[]>(SAMPLE_PARAGRAPHS)
  const [current, setCurrent] = React.useState(0)
  const [manualText, setManualText] = React.useState("")
  const [showLibrary, setShowLibrary] = React.useState(false)

  const [rate, setRate] = React.useState(settings.rate)
  const [pitch, setPitch] = React.useState(settings.pitch)
  const [volume, setVolume] = React.useState(settings.volume)
  const [voiceURI, setVoiceURI] = React.useState<string | null>(
    settings.defaultVoiceURI,
  )
  const [status, setStatus] = React.useState<"idle" | "playing" | "paused">(
    "idle",
  )
  const [autoAdvance, setAutoAdvance] = React.useState(true)

  const [importing, setImporting] = React.useState(false)
  const [importError, setImportError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const utterRef = React.useRef<SpeechSynthesisUtterance | null>(null)
  const currentRef = React.useRef(current)
  currentRef.current = current
  const autoAdvanceRef = React.useRef(autoAdvance)
  autoAdvanceRef.current = autoAdvance
  const paragraphsRef = React.useRef(paragraphs)
  paragraphsRef.current = paragraphs

  // Pick a sensible default voice once voices load.
  React.useEffect(() => {
    if (voiceURI || voices.length === 0) return
    const base = settings.defaultLang.split("-")[0]
    const preferred =
      voices.find((v) => v.voiceURI === settings.defaultVoiceURI) ??
      voices.find((v) => v.lang.replace("_", "-") === settings.defaultLang) ??
      voices.find((v) => v.lang.startsWith(base)) ??
      voices.find((v) => v.default) ??
      voices[0]
    if (preferred) setVoiceURI(preferred.voiceURI)
  }, [voices, voiceURI, settings.defaultVoiceURI, settings.defaultLang])

  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const selectedVoice = voices.find((v) => v.voiceURI === voiceURI) ?? null

  // Persist reading progress as we move through a book.
  React.useEffect(() => {
    if (activeBook) updateBookProgress(activeBook.id, current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, activeBook?.id])

  const speakParagraph = React.useCallback(
    (index: number) => {
      const list = paragraphsRef.current
      const text = list[index]
      if (!supported || !text) {
        setStatus("idle")
        return
      }
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      if (selectedVoice) {
        u.voice = selectedVoice
        u.lang = selectedVoice.lang
      }
      u.rate = rate
      u.pitch = pitch
      u.volume = volume
      u.onend = () => {
        const next = currentRef.current + 1
        if (autoAdvanceRef.current && next < paragraphsRef.current.length) {
          setCurrent(next)
          speakParagraph(next)
        } else {
          setStatus("idle")
        }
      }
      u.onerror = () => setStatus("idle")
      utterRef.current = u
      window.speechSynthesis.speak(u)
      setStatus("playing")
    },
    [supported, selectedVoice, rate, pitch, volume],
  )

  const play = () => speakParagraph(current)

  const togglePause = () => {
    if (status === "playing") {
      window.speechSynthesis.pause()
      setStatus("paused")
    } else if (status === "paused") {
      window.speechSynthesis.resume()
      setStatus("playing")
    }
  }

  const stop = () => {
    window.speechSynthesis.cancel()
    setStatus("idle")
  }

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(paragraphs.length - 1, index))
    const wasPlaying = status === "playing" || status === "paused"
    window.speechSynthesis.cancel()
    setCurrent(clamped)
    if (wasPlaying) {
      // Slight delay so cancel() settles before speaking again.
      setTimeout(() => speakParagraph(clamped), 50)
    } else {
      setStatus("idle")
    }
  }

  const applyManualText = () => {
    const text = manualText.trim()
    if (!text) return
    window.speechSynthesis.cancel()
    const paras = text
      .split(/\n{2,}/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean)
    setActiveBook(null)
    setParagraphs(paras.length ? paras : [text])
    setCurrent(0)
    setStatus("idle")
  }

  const openBook = (book: Book) => {
    window.speechSynthesis.cancel()
    setActiveBook(book)
    setParagraphs(book.paragraphs)
    setCurrent(Math.min(book.progress, book.paragraphs.length - 1))
    setManualText("")
    setStatus("idle")
    setShowLibrary(false)
  }

  const handleFile = async (file: File) => {
    setImportError(null)
    const ext = detectExt(file.name)
    if (!ext) {
      setImportError(
        "Formato no compatible. Usa un archivo PDF, Word (.docx), EPUB o TXT.",
      )
      return
    }
    setImporting(true)
    try {
      const { title, paragraphs: extracted } = await extractBook(file)
      if (extracted.length === 0) {
        setImportError(
          "No se pudo extraer texto de este archivo. ¿Es un PDF escaneado (imagen)?",
        )
        return
      }
      const allText = extracted.join(" ")
      const book: Book = {
        id: uid(),
        title,
        paragraphs: extracted,
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sourceName: file.name,
        wordCount: countWords(allText),
      }
      addBook(book)
      openBook(book)
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al leer el archivo.",
      )
    } finally {
      setImporting(false)
    }
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const progressPct =
    paragraphs.length > 0 ? ((current + 1) / paragraphs.length) * 100 : 0

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <Header
          eyebrow="Texto a Audio"
          title={activeBook ? activeBook.title : "Convierte tu texto en voz"}
          subtitle={
            activeBook
              ? `Párrafo ${current + 1} de ${paragraphs.length} · ${activeBook.wordCount.toLocaleString("es")} palabras`
              : "Sube un libro (PDF, Word, EPUB) o pega tu texto. Todo se sintetiza localmente en tu dispositivo."
          }
        />
        {books.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowLibrary(true)}
            className="mt-1 h-9 shrink-0 gap-2"
          >
            <Library className="h-4 w-4" />
            Mi biblioteca
            <span className="rounded-full bg-secondary px-1.5 text-[11px] font-semibold text-muted-foreground">
              {books.length}
            </span>
          </Button>
        )}
      </div>

      {!supported && (
        <Notice>
          Tu navegador no admite la API de síntesis de voz. Prueba con la
          versión más reciente de Chrome, Edge o Safari.
        </Notice>
      )}

      {/* Library modal */}
      {showLibrary && (
        <LibraryModal
          books={books}
          onOpen={openBook}
          onDelete={removeBook}
          onClose={() => setShowLibrary(false)}
        />
      )}

      {/* Upload zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors hover:border-primary/50"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.epub,.txt"
          className="hidden"
          onChange={onFileInputChange}
        />
        {importing ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Extrayendo texto del archivo…
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <FileUp className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Arrastra tu libro aquí o{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline"
              >
                elige un archivo
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word (.docx), EPUB o TXT
            </p>
          </div>
        )}
        {importError && (
          <p className="mt-3 text-xs font-medium text-destructive">
            {importError}
          </p>
        )}
      </div>

      {/* Manual text entry (collapsible-ish, always available) */}
      {!activeBook && (
        <details className="mt-4 rounded-2xl border border-border bg-card open:pb-1.5">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-foreground">
            O pega tu propio texto
          </summary>
          <div className="px-1.5 pb-1.5">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Pega o escribe tu texto aquí…"
              rows={6}
              className="w-full resize-none rounded-xl bg-transparent p-4 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                {countWords(manualText)} palabras
              </span>
              <Button
                onClick={applyManualText}
                disabled={!manualText.trim()}
                size="sm"
                className="h-8"
              >
                Usar este texto
              </Button>
            </div>
          </div>
        </details>
      )}

      {/* Reading progress bar */}
      {paragraphs.length > 1 && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Current paragraph display */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            {activeBook ? "Leyendo" : "Vista previa"}
          </span>
          {paragraphs.length > 1 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {current + 1} / {paragraphs.length}
            </span>
          )}
        </div>
        <p className="max-h-64 overflow-y-auto text-[15px] leading-relaxed text-foreground">
          {paragraphs[current] ?? ""}
        </p>
      </div>

      {/* Transport controls */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="h-12 flex-1 overflow-hidden">
          <Waveform active={status === "playing"} bars={40} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            className="h-11 w-11 p-0"
            aria-label="Párrafo anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {status === "idle" ? (
            <Button
              onClick={play}
              disabled={!supported || paragraphs.length === 0}
              className="h-11 gap-2 px-5"
            >
              <Play className="h-4 w-4 fill-current" />
              Reproducir
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={togglePause}
                className="h-11 w-11 p-0"
                aria-label={status === "playing" ? "Pausar" : "Reanudar"}
              >
                {status === "playing" ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={stop}
                className="h-11 w-11 p-0"
                aria-label="Detener"
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            onClick={() => goTo(current + 1)}
            disabled={current >= paragraphs.length - 1}
            className="h-11 w-11 p-0"
            aria-label="Párrafo siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Voice controls */}
      <div className="mt-4 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Voz</Label>
          <select
            value={voiceURI ?? ""}
            onChange={(e) => setVoiceURI(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {voices.length === 0 && <option>Cargando voces…</option>}
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} — {languageLabel(v.lang)}
              </option>
            ))}
          </select>
        </div>

        <SliderField
          label="Velocidad"
          value={rate}
          min={0.5}
          max={2}
          step={0.1}
          onChange={setRate}
          format={(v) => `${v.toFixed(1)}×`}
        />
        <SliderField
          label="Tono"
          value={pitch}
          min={0}
          max={2}
          step={0.1}
          onChange={setPitch}
          format={(v) => v.toFixed(1)}
        />
        <SliderField
          label="Volumen"
          value={volume}
          min={0}
          max={1}
          step={0.05}
          onChange={setVolume}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <div className="flex items-end gap-2">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Avanzar solo al siguiente párrafo
          </label>
          <Button
            variant="outline"
            onClick={() => {
              setRate(1)
              setPitch(1)
              setVolume(1)
              updateSettings({ rate: 1, pitch: 1, volume: 1 })
            }}
            className="h-10 gap-2 shrink-0"
            aria-label="Restablecer"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Library ------------------------------ */

function LibraryModal({
  books,
  onOpen,
  onDelete,
  onClose,
}: {
  books: Book[]
  onOpen: (book: Book) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Mi biblioteca
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {books.map((book) => {
            const pct =
              book.paragraphs.length > 0
                ? Math.round(
                    ((book.progress + 1) / book.paragraphs.length) * 100,
                  )
                : 0
            return (
              <div
                key={book.id}
                className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-secondary/60"
              >
                <button
                  onClick={() => onOpen(book)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {book.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {pct}% leído · {book.wordCount.toLocaleString("es")}{" "}
                      palabras
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => onDelete(book.id)}
                  className="rounded-lg p-2 text-muted-foreground opacity-0 hover:bg-secondary hover:text-destructive group-hover:opacity-100"
                  aria-label="Eliminar libro"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
          {books.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Todavía no subiste ningún libro.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------- shared bits ---------------------------- */

export function Header({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-balance md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
        {subtitle}
      </p>
    </div>
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {children}
    </label>
  )
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
      {children}
    </div>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        aria-label={label}
      />
    </div>
  )
}
