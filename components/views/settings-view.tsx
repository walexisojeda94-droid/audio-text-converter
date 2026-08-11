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
  const { settings, updateSettings, history, clearHistory } = useApp()
  const { voices } = useVoices()

  return (
    <div className="mx-auto max-w-2xl">
      <Header
        eyebrow="Settings"
        title="Preferences"
        subtitle="Tune the defaults for new conversions. These are stored on this device only."
      />

      <div className="flex flex-col gap-4">
        <Section title="Appearance" description="Choose how Timbre looks.">
          <div className="flex gap-2">
            {(
              [
                ["system", "System", Monitor],
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
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
          title="Default voice"
          description="Used as the starting voice on the Text to Audio screen."
        >
          <select
            value={settings.defaultVoiceURI ?? ""}
            onChange={(e) =>
              updateSettings({ defaultVoiceURI: e.target.value || null })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Automatic</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} — {languageLabel(v.lang)}
              </option>
            ))}
          </select>
        </Section>

        <Section
          title="Default recognition language"
          description="Used as the starting language on the Audio to Text screen."
        >
          <select
            value={settings.defaultLang}
            onChange={(e) => updateSettings({ defaultLang: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {[
              "en-US",
              "en-GB",
              "es-ES",
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
          title="Storage"
          description="Save conversions and recorded audio to your history."
        >
          <div className="flex flex-col gap-1">
            <Toggle
              label="Save conversions to history"
              checked={settings.saveHistory}
              onChange={(v) => updateSettings({ saveHistory: v })}
            />
            <Toggle
              label="Store recorded audio with transcripts"
              checked={settings.saveAudio}
              onChange={(v) => updateSettings({ saveAudio: v })}
            />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {history.length} saved{" "}
                {history.length === 1 ? "item" : "items"}
              </p>
              <p className="text-xs text-muted-foreground">
                Stored locally in this browser
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={clearHistory}
              disabled={history.length === 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
          </div>
        </Section>

        <Section title="About" description="How Timbre handles your data.">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Timbre performs text-to-speech and speech-to-text entirely in your
            browser using the built-in Web Speech APIs. Your text, recordings,
            and history never leave your device — there is no server and no
            account required.
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between py-2 text-left"
      role="switch"
      aria-checked={checked}
    >
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  )
}
