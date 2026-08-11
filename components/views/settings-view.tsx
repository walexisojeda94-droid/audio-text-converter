"use client"

import * as React from "react"
import { Monitor, Moon, Sun, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/components/app-provider"
import { languageLabel, useVoices } from "@/lib/use-voices"
import type { Settings } from "@/lib/types"
import { Header } from "./text-to-audio"
import { cn } from "@/lib/utils"

export function SettingsView() {
  const { settings, updateSettings, history, books, clearHistory } = useApp()
  const { voices } = useVoices()

  return (
    <div className="mx-auto max-w-2xl">
      <Header
        eyebrow="Ajustes"
        title="Preferencias"
        subtitle="Configurá los valores por defecto. Todo se guarda solo en este dispositivo."
      />

      <div className="flex flex-col gap-4">
        <Section title="Apariencia" description="Elegí cómo se ve la app.">
          <div className="flex gap-2">
            {(
              [
                ["system", "Sistema", Monitor],
                ["light", "Claro", Sun],
                ["dark", "Oscuro", Moon],
              ] as [Settings["theme"], string, React.ElementType][]
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => updateSettings({ theme: value })}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors",
                  settings.theme === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Voz por defecto"
          description="La voz con la que arranca cada vez que abrís un libro o texto nuevo."
        >
          <select
            value={settings.defaultVoiceURI ?? ""}
            onChange={(e) =>
              updateSettings({ defaultVoiceURI: e.target.value || null })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Automática</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} — {languageLabel(v.lang)}
              </option>
            ))}
          </select>
        </Section>

        <Section
          title="Idioma por defecto"
          description="Se usa para elegir la voz automática cuando no hay una guardada."
        >
          <select
            value={settings.defaultLang}
            onChange={(e) => updateSettings({ defaultLang: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {[
              "es-419",
              "es-ES",
              "en-US",
              "en-GB",
              "fr-FR",
              "de-DE",
              "it-IT",
              "pt-BR",
              "nl-NL",
              "hi-IN",
              "ja-JP",
              "ko-KR",
              "zh-CN",
            ].map((l) => (
              <option key={l} value={l}>
                {languageLabel(l)} · {l}
              </option>
            ))}
          </select>
        </Section>

        <Section
          title="Almacenamiento"
          description="Tus libros y textos guardados, todo local en este navegador."
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {books.length} {books.length === 1 ? "libro" : "libros"} en
                  la biblioteca
                </p>
                <p className="text-xs text-muted-foreground">
                  Incluye el progreso de lectura de cada uno
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {history.length}{" "}
                  {history.length === 1 ? "texto guardado" : "textos guardados"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fragmentos sueltos en el historial
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={clearHistory}
                disabled={history.length === 0}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Borrar
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Acerca de" description="Cómo maneja tus datos esta app.">
          <p className="text-sm leading-relaxed text-muted-foreground">
            La lectura en voz alta se hace enteramente en tu navegador con las
            APIs nativas del sistema. Tus libros, textos e historial nunca
            salen de tu dispositivo — no hay servidor ni cuenta de por medio.
          </p>
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mb-4 mt-0.5 text-xs text-muted-foreground">{description}</p>
      {children}
    </section>
  )
}
