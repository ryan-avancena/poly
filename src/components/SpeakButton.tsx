import { isSpeechSupported, speak } from '../lib/speech'

interface SpeakButtonProps {
  text: string
  className?: string
}

export default function SpeakButton({ text, className = '' }: SpeakButtonProps) {
  if (!isSpeechSupported() || !text.trim()) return null

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        speak(text)
      }}
      title="Pronounce"
      className={`text-gray-400 hover:text-black shrink-0 ${className}`}
    >
      🔊
    </button>
  )
}
