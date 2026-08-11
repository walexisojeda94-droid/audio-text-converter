"use client"

import * as React from "react"
import { Check, Copy, Mic, Save, Square, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Waveform } from "@/components/waveform"
import { useApp } from "@/components/app-provider"
import { Header, Label, Notice } from "./text-to-audio"
import { languageLabel } from "@/lib/use-voices"
import { countWords, makeTitle, uid } from "@/lib/format"
import type { HistoryItem } from "@/lib/types"

const LANGS = [
  "es-MX",
  "es-419",
  "es-AR",
  "es-CO",
  "es-CL",
  "es-US",
  "es-ES",
  "en-US",
  "en-GB",
  "pt-BR",
  "fr-FR",
  "de-DE",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "zh-CN",
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRecognition(): any {
  if (typeof window === "undefined") return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export function AudioToText() {
  const { settings, updateSettings, addHistory } = useApp()
  const [supported, setSupported] = React.useState(true)
  const [recording, setRecording] = React.useState(false)
  const [lang, setLang] = React.useState(settings.defaultLang)
  const [finalText, setFinalText] = React.useState("")
  const [interim, setInterim] = React.useState("")
  const [elapsed, setElapsed] = React.useState(0)
  const [copied, setCopied] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = React.useRef<any>(null)
  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const audioBlobRef = React.useRef<Blob | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = React.useRef(0)

  React.useEffect(() => {
    if (!getRecognition()) setSupported(false)
    return () => stopEverything()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopEverything = () => {
    try {
      recogRef.current?.stop()
    } catch {}
    try {
      recorderRef.current?.state === "recording" && recorderRef.current.stop()
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const start = async () => {
    const recog = getRecognition()
    if (!recog) {
      setSupported(false)
      return
    }
    setFinalText("")
    setInterim("")
    setElapsed(0)
    audioBlobRef.current = null

    // Recording of the mic audio (optional, best-effort).
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const rec = new MediaRecorder(stream)
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        audioBlobRef.current = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        })
      }
      rec.start()
      recorderRef.current = rec
    } catch {
      // Mic recording denied/unavailable — recognition may still work.
    }

    recog.lang = lang
    recog.continuous = true
    recog.interimResults = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      let interimStr = ""
      let finalStr = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalStr += r[0].transcript
        else interimStr += r[0].transcript
      }
      if (finalStr) setFinalText((prev) => (prev + " " + finalStr).trim())
      setInterim(interimStr)
    }
    recog.onerror = () => {}
    recog.onend = () => {
      if (recogRef.current?.__wantActive) {
        try {
          recog.start()
        } catch {}
      }
    }
    recog.__wantActive = true
    recogRef.current = recog
    recog.start()

    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000)
    }, 200)

    setRecording(true)
  }

  const stop = () => {
    if (recogRef.current) recogRef.current.__wantActive = false
    stopEverything()
    setInterim("")
    setRecording(false)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(finalText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const save = async () => {
    const text = finalText.trim()
    if (!text) return
    const blob = audioBlobRef.current
    const item: HistoryItem = {
      id: uid(),
      type: "audio-to-text",
      createdAt: Date.now(),
      text,
      title: makeTitle(text),
      wordCount: countWords(text),
      durationSec: elapsed || undefined,
      hasAudio: !!blob,
      meta: { lang },
    }
    await addHistory(item, blob ?? undefined)
    updateSettings({ defaultLang: lang })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const clear = () => {
    setFinalText("")
    setInterim("")
    audioBlobRef.current = null
  }

  const display = (finalText + " " + interim).trim()
  const mm = Math.floor(elapsed / 60)
  const ss = Math.floor(elapsed % 60)

  return (
    <div className="mx-auto max-w-3xl">
      <Header
        eyebrow="Audio a Texto"
        title="Habla y velo escrito"
        subtitle="Graba desde tu micrófono y Timbre lo transcribe en vivo. El audio capturado y la transcripción se pueden guardar en tu historial."
      />

      {!supported && (
        <Notice>
          La transcripción en vivo necesita la API de reconocimiento de voz web,
          disponible en Chrome y Edge. En otros navegadores aún puedes grabar,
          pero la transcripción automática no estará disponible.
        </Notice>
      )}

      {/* Recorder */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-full max-w-md overflow-hidden">
            <Waveform active={recording} bars={44} />
          </div>

          <button
            onClick={recording ? stop : start}
            className={
              "flex h-20 w-20 items-center justify-center rounded-full transition-transform active:scale-95 " +
              (recording
                ? "bg-destructive text-white shadow-lg shadow-destructive/30"
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/25")
            }
            aria-label={recording ? "Detener grabación" : "Iniciar grabación"}
          >
            {recording ? (
              <Square className="h-7 w-7" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </button>

          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {recording ? "Escuchando…" : "Toca para empezar a grabar"}
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {mm}:{ss.toString().padStart(2, "0")}
            </p>
          </div>

          <div className="w-full max-w-xs">
            <Label>Recognition language</Label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              disabled={recording}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Transcript</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {countWords(finalText)} words
          </span>
        </div>
        <div className="min-h-32 rounded-xl bg-secondary/60 p-4 text-[15px] leading-relaxed">
          {display ? (
            <p className="text-foreground">
              {finalText}{" "}
              <span className="text-muted-foreground">{interim}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Your transcription will appear here as you speak.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={save}
            disabled={!finalText.trim()}
            variant={saved ? "secondary" : "default"}
            className="h-10 gap-2"
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved" : "Save to history"}
          </Button>
          <Button
            variant="outline"
            onClick={copy}
            disabled={!finalText.trim()}
            className="h-10 gap-2"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="ghost"
            onClick={clear}
            disabled={!finalText.trim() || recording}
            className="h-10 gap-2 text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
