export type ConversionType = "text-to-audio" | "audio-to-text"

export interface HistoryItem {
  id: string
  type: ConversionType
  createdAt: number
  /** The text side of the conversion (input for TTS, output for STT). */
  text: string
  /** Short preview/title derived from the text. */
  title: string
  /** Duration of the audio in seconds, when known. */
  durationSec?: number
  /** Word count of the text. */
  wordCount: number
  /** For text-to-audio: the voice/lang/rate used. */
  meta?: {
    voice?: string
    lang?: string
    rate?: number
    pitch?: number
    volume?: number
    /** Original source file name for audio-to-text. */
    sourceName?: string
  }
  /** Whether an audio blob is stored for this item (in IndexedDB). */
  hasAudio: boolean
}

export interface Settings {
  theme: "system" | "light" | "dark"
  defaultVoiceURI: string | null
  defaultLang: string
  rate: number
  pitch: number
  volume: number
  saveHistory: boolean
  saveAudio: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  defaultVoiceURI: null,
  defaultLang: "en-US",
  rate: 1,
  pitch: 1,
  volume: 1,
  saveHistory: true,
  saveAudio: true,
}
