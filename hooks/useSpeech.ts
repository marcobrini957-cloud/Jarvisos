'use client'

import { useState, useCallback } from 'react'

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-•]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .trim()
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find(v => v.name === 'Google UK English Male') ||
    voices.find(v => v.name === 'Google UK English Female') ||
    voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
    voices.find(v => v.lang.startsWith('en') && v.localService === false) ||
    voices.find(v => v.lang.startsWith('en')) ||
    null
  )
}

export function useSpeech() {
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null)

  const speak = useCallback((text: string, idx: number) => {
    if (!window.speechSynthesis) return

    if (speakingIdx === idx) {
      window.speechSynthesis.cancel()
      setSpeakingIdx(null)
      return
    }

    window.speechSynthesis.cancel()

    const utt = new SpeechSynthesisUtterance(stripMarkdown(text))
    utt.rate = 0.93
    utt.pitch = 1.0
    utt.volume = 1.0

    const trySpeak = () => {
      const voice = pickVoice()
      if (voice) utt.voice = voice
      utt.onstart = () => setSpeakingIdx(idx)
      utt.onend   = () => setSpeakingIdx(null)
      utt.onerror = () => setSpeakingIdx(null)
      window.speechSynthesis.speak(utt)
    }

    // voices may not be loaded yet on first call
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true })
    } else {
      trySpeak()
    }
  }, [speakingIdx])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeakingIdx(null)
  }, [])

  return { speak, stop, speakingIdx }
}
