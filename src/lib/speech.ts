/** Pronunciation via the browser's built-in SpeechSynthesis API (free, no API key). */

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function getItalianVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang.toLowerCase().startsWith('it'))
}

export function speak(text: string, lang = 'it-IT') {
  if (!isSpeechSupported() || !text.trim()) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang

  const voice = getItalianVoice()
  if (voice) utterance.voice = voice

  window.speechSynthesis.speak(utterance)
}
