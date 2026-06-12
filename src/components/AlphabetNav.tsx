const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')

interface AlphabetNavProps {
  availableLetters: Set<string>
  onSelect: (letter: string) => void
}

export default function AlphabetNav({ availableLetters, onSelect }: AlphabetNavProps) {
  return (
    <nav className="hidden sm:flex flex-col gap-0.5 sticky top-4 self-start text-xs">
      {LETTERS.map((letter) => {
        const available = availableLetters.has(letter)
        return (
          <button
            key={letter}
            type="button"
            disabled={!available}
            onClick={() => onSelect(letter)}
            className={
              available
                ? 'w-5 text-center hover:font-bold hover:underline'
                : 'w-5 text-center text-gray-300 cursor-default'
            }
          >
            {letter.toUpperCase()}
          </button>
        )
      })}
    </nav>
  )
}
