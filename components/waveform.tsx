"use client"

import { cn } from "@/lib/utils"

interface WaveformProps {
  active?: boolean
  bars?: number
  className?: string
  /** Static heights (0-1) to render a frozen waveform; overrides animation. */
  levels?: number[]
}

// Deterministic pseudo-random heights so SSR and client match.
function seededHeights(n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const v = Math.abs(Math.sin(i * 12.9898) * 43758.5453)
    out.push(0.25 + (v - Math.floor(v)) * 0.75)
  }
  return out
}

export function Waveform({
  active = false,
  bars = 48,
  className,
  levels,
}: WaveformProps) {
  const heights = levels ?? seededHeights(bars)
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center gap-[3px]", className)}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-primary/70",
            active && "animate-wave",
          )}
          style={{
            height: `${Math.round(h * 100)}%`,
            animationDelay: `${(i % 12) * 90}ms`,
            animationDuration: `${900 + (i % 5) * 120}ms`,
          }}
        />
      ))}
    </div>
  )
}
