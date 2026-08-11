"use client"

import * as React from "react"
import {
  AudioLines,
  Clock,
  Mic,
  Settings as SettingsIcon,
  Type,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "./app-provider"
import { TextToAudio } from "./views/text-to-audio"
import { AudioToText } from "./views/audio-to-text"
import { HistoryView } from "./views/history-view"
import { SettingsView } from "./views/settings-view"

type View = "text-to-audio" | "audio-to-text" | "history" | "settings"

const NAV: { id: View; label: string; icon: React.ElementType; hint: string }[] =
  [
    { id: "text-to-audio", label: "Text to Audio", icon: Type, hint: "Speak" },
    { id: "audio-to-text", label: "Audio to Text", icon: Mic, hint: "Listen" },
    { id: "history", label: "History", icon: Clock, hint: "Library" },
    { id: "settings", label: "Settings", icon: SettingsIcon, hint: "Config" },
  ]

export function AppShell() {
  const { ready, history } = useApp()
  const [view, setView] = React.useState<View>("text-to-audio")

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <AudioLines className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Timbre</p>
            <p className="text-xs text-muted-foreground">Voice studio</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const activeState = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  activeState
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
                aria-current={activeState ? "page" : undefined}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
                {item.id === "history" && history.length > 0 && (
                  <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground group-aria-[current=page]:bg-primary/15 group-aria-[current=page]:text-primary">
                    {history.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium text-foreground">Private by design</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Conversions run in your browser. Nothing is uploaded.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-5 pb-28 pt-6 md:px-10 md:pb-10 md:pt-10">
        {ready ? (
          <>
            {view === "text-to-audio" && <TextToAudio />}
            {view === "audio-to-text" && <AudioToText />}
            {view === "history" && <HistoryView onNavigate={setView} />}
            {view === "settings" && <SettingsView />}
          </>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-background/90 px-2 py-2 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon
          const activeState = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                activeState ? "text-primary" : "text-muted-foreground",
              )}
              aria-current={activeState ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              {item.label.split(" ")[0]}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
