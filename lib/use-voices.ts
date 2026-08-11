"use client"

import * as React from "react"

export function useVoices() {
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([])
  const [supported, setSupported] = React.useState(true)

  React.useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false)
      return
    }
    const load = () => {
      const list = window.speechSynthesis.getVoices()
      if (list.length) setVoices(list)
    }
    load()
    window.speechSynthesis.addEventListener("voiceschanged", load)
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", load)
  }, [])

  return { voices, supported }
}

export function languageLabel(code: string): string {
  try {
    const dn = new Intl.DisplayNames(undefined, { type: "language" })
    const base = code.split("-")[0]
    const region = code.split("-")[1]
    const lang = dn.of(base) ?? code
    if (region) {
      const rn = new Intl.DisplayNames(undefined, { type: "region" })
      return `${lang} (${rn.of(region) ?? region})`
    }
    return lang
  } catch {
    return code
  }
}
