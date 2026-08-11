"use client"

import * as React from "react"
import { Pause, Play, RotateCcw, Save, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Waveform } from "@/components/waveform"
import { useApp } from "@/components/app-provider"
import { languageLabel, useVoices } from "@/lib/use-voices"
import { countWords, makeTitle, uid } from "@/lib/format"
import type { HistoryItem } from "@/lib/types"

const SAMPLE =
  "Hola — soy Timbre. Escribe lo que quieras aquí y lo leeré en voz alta con la voz que elijas. Prueba ajustando la velocidad y el tono más abajo."

export function TextToAudio() {
  const { settings, updateSettings, addHistory } = useApp()
  const { voices, supported } = useVoices()

  const [text, setText] = React.useState("")
  const [rate, setRate] = React.useState(settings.rate)
  const [pitch, setPitch] = React.useState(settings.pitch)
  const [volume, setVolume] = React.useState(settings.volume)
  const [voiceURI, setVoiceURI] = React.useState<string | null>(
    settings.defaultVoiceURI,
  )
  const [status, setStatus] = React.useState<"idle" | "playing" | "paused">(
    "idle",
  )
  const [saved, setSaved] = React.useState(false)

  const utterRef = React.useRef<SpeechSynthesisUtterance | null>(null)

  // Pick a sensible default voice once voices load.
  React.useEffect(() => {
    if (voiceURI || voices.length === 0) return
    const base = settings.defaultLang.split("-")[0] // e.g. "es"
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

  const speak = () => {
    if (!supported || !text.trim()) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    if (selectedVoice) {
      u.voice = selectedVoice
      u.lang = selectedVoice.lang
    }
    u.rate = rate
    u.pitch = pitch
    u.volume = volume
    u.onend = () => setStatus("idle")
    u.onerror = () => setStatus("idle")
    utterRef.current = u
    window.speechSynthesis.speak(u)
    setStatus("playing")
  }

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

  const save = async () => {
    if (!text.trim()) return
    const item: HistoryItem = {
      id: uid(),
      type: "text-to-audio",
      createdAt: Date.now(),
      text,
      title: makeTitle(text),
      wordCount: countWords(text),
      hasAudio: false,
      meta: {
        voice: selectedVoice?.name,
        lang: selectedVoice?.lang,
        rate,
        pitch,
        volume,
      },
    }
    await addHistory(item)
    updateSettings({
      defaultVoiceURI: voiceURI,
      rate,
      pitch,
      volume,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const words = countWords(text)

  return (
    <div className="mx-auto max-w-3xl">
      <Header
        eyebrow="Texto a Audio"
        title="Convierte tu texto en voz"
        subtitle="Escribe o pega tu texto, elige una voz y presiona reproducir. Todo se sintetiza localmente en tu dispositivo."
      />

      {!supported && (
        <Notice>
          Tu navegador no admite la API de síntesis de voz. Prueba con la
          versión más reciente de Chrome, Edge o Safari.
        </Notice>
      )}

      <div className="rounded-2xl border border-border bg-card p-1.5 shadow-sm">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Empieza a escribir aquí…"
            rows={7}
            className="w-full resize-none rounded-xl bg-transparent p-4 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <button
              onClick={() => setText(SAMPLE)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Insertar texto de ejemplo
            </button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {words} {words === 1 ? "palabra" : "palabras"} · {text.length}{" "}
              caracteres
            </span>
          </div>
        </div>
      </div>

      {/* Waveform + transport */}
      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="h-12 flex-1 overflow-hidden">
          <Waveform active={status === "playing"} bars={56} />
        </div>
        <div className="flex items-center gap-2">
          {status === "idle" ? (
            <Button
              onClick={speak}
              disabled={!supported || !text.trim()}
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
          <Button
            variant="outline"
            onClick={() => {
              setRate(1)
              setPitch(1)
              setVolume(1)
            }}
            className="h-10 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </Button>
          <Button
            variant={saved ? "secondary" : "default"}
            onClick={save}
            disabled={!text.trim()}
            className="h-10 flex-1 gap-2"
          >
            <Save className="h-4 w-4" />
            {saved ? "Guardado en historial" : "Guardar en historial"}
          </Button>
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
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
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
