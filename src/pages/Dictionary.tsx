import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { lookupWord, type DictionaryEntry, type Direction } from '../lib/dictionary'
import { suggestWords } from '../lib/wordlist'
import AlphabetNav from '../components/AlphabetNav'
import SpeakButton from '../components/SpeakButton'
import WordModal from '../components/WordModal'
import type { Word } from '../lib/types'

export default function Dictionary() {
  const [words, setWords] = useState<Word[]>([])
  const [loadingWords, setLoadingWords] = useState(true)
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState<Direction>('it-en')
  const [entry, setEntry] = useState<DictionaryEntry | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [searchError, setSearchError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newIt, setNewIt] = useState('')
  const [newEn, setNewEn] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editIt, setEditIt] = useState('')
  const [editEn, setEditEn] = useState('')

  const [selectedWord, setSelectedWord] = useState<Word | null>(null)

  useEffect(() => {
    loadWords()
  }, [])

  async function loadWords() {
    setLoadingWords(true)
    const { data, error } = await supabase.from('words').select('*').order('it', { ascending: true })

    if (error) setError(error.message)
    else setWords(data as Word[])
    setLoadingWords(false)
  }

  const suggestions = suggestWords(query, direction === 'it-en' ? 'it' : 'en', words)

  const grouped = useMemo(() => {
    const map = new Map<string, Word[]>()
    for (const w of words) {
      const letter = w.it[0]?.toLowerCase() ?? '#'
      if (!map.has(letter)) map.set(letter, [])
      map.get(letter)!.push(w)
    }
    return map
  }, [words])

  const availableLetters = useMemo(() => new Set(grouped.keys()), [grouped])

  function scrollToLetter(letter: string) {
    document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function runLookup(word: string) {
    if (!word.trim()) return

    setStatus('loading')
    setSearchError('')
    try {
      const result = await lookupWord(word, direction)
      setEntry(result)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setSearchError(err instanceof Error ? err.message : 'Lookup failed')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setShowSuggestions(false)
    await runLookup(query)
  }

  function handleSuggestionClick(word: string) {
    setQuery(word)
    setShowSuggestions(false)
    runLookup(word)
  }

  const alreadyInGlossary = useMemo(() => {
    if (!entry) return false
    const value = direction === 'it-en' ? entry.word : entry.translation
    if (!value) return false
    return words.some((w) => w.it.toLowerCase() === value.toLowerCase())
  }, [entry, direction, words])

  async function handleAddFromSearch() {
    if (!entry) return
    const it = direction === 'it-en' ? entry.word : entry.translation
    const en = direction === 'it-en' ? entry.translation : entry.word
    if (!it || !en) return

    const { error } = await supabase.from('words').insert({ it, en })
    if (error) {
      setError(error.message)
      return
    }
    loadWords()
  }

  async function handleAddWord(e: React.FormEvent) {
    e.preventDefault()
    if (!newIt.trim() || !newEn.trim()) return

    const { error } = await supabase.from('words').insert({ it: newIt.trim(), en: newEn.trim() })
    if (error) {
      setError(error.message)
      return
    }
    setNewIt('')
    setNewEn('')
    setShowAddForm(false)
    loadWords()
  }

  function startEdit(w: Word) {
    setEditingId(w.id)
    setEditIt(w.it)
    setEditEn(w.en)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editingId || !editIt.trim() || !editEn.trim()) return

    const { error } = await supabase
      .from('words')
      .update({ it: editIt.trim(), en: editEn.trim() })
      .eq('id', editingId)

    if (error) {
      setError(error.message)
      return
    }

    setEditingId(null)
    loadWords()
  }

  async function handleDeleteWord(id: string) {
    const { error } = await supabase.from('words').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setEditingId(null)
    loadWords()
  }

  return (
    <div className="flex gap-4">
      <div className="flex-1 max-w-xl">
        {error && <p className="text-sm text-gray-500 mb-2">Error: {error}</p>}

        <form onSubmit={handleSubmit} className="flex gap-2 mb-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            placeholder={direction === 'it-en' ? 'cercare una parola italiana...' : 'search an english word...'}
            className="flex-1 border border-black px-3 py-2 text-sm focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setDirection((d) => (d === 'it-en' ? 'en-it' : 'it-en'))}
            className="border border-black px-3 py-2 text-sm hover:bg-black hover:text-white"
            title="Swap direction"
          >
            {direction === 'it-en' ? 'IT → EN' : 'EN → IT'}
          </button>
          <button type="submit" className="border border-black px-3 py-2 text-sm hover:bg-black hover:text-white">
            Search
          </button>
        </form>

        <div className="flex gap-1 flex-wrap mb-6 min-h-[22px]">
          {showSuggestions &&
            suggestions.map((word) => (
              <button
                key={word}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSuggestionClick(word)}
                className="border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:border-black hover:text-black"
              >
                {word}
              </button>
            ))}
        </div>

        {status === 'loading' && <p className="text-sm text-gray-500">Looking up...</p>}
        {status === 'error' && <p className="text-sm text-gray-500">Error: {searchError}</p>}

        {entry && status === 'idle' && (
          <div className="space-y-4 mb-8">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {entry.word}
                  {direction === 'it-en' && <SpeakButton text={entry.word} />}
                </h2>
                {entry.phonetic && <p className="text-sm text-gray-500">{entry.phonetic}</p>}
              </div>
              {!alreadyInGlossary && entry.translation && (
                <button
                  onClick={handleAddFromSearch}
                  className="border border-black px-2 py-1 text-xs hover:bg-black hover:text-white shrink-0"
                >
                  + add to glossary
                </button>
              )}
            </div>

            {entry.translation && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Translation</p>
                <p className="text-lg flex items-center gap-2">
                  {entry.translation}
                  {direction === 'en-it' && <SpeakButton text={entry.translation} />}
                </p>
              </div>
            )}

            {entry.meanings.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Definitions</p>
                <div className="space-y-3">
                  {entry.meanings.map((meaning, i) => (
                    <div key={i}>
                      {meaning.partOfSpeech && (
                        <p className="text-sm italic text-gray-500">{meaning.partOfSpeech}</p>
                      )}
                      <ol className="list-decimal list-inside space-y-1">
                        {meaning.definitions.map((def, j) => (
                          <li key={j} className="text-sm">
                            {def}
                          </li>
                        ))}
                      </ol>
                      {meaning.examples.length > 0 && (
                        <ul className="mt-1 space-y-1">
                          {meaning.examples.map((ex, j) => (
                            <li key={j} className="text-sm text-gray-500 pl-4">
                              &ldquo;{ex}&rdquo;
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!entry.translation && entry.meanings.length === 0 && (
              <p className="text-sm text-gray-500">No results found.</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide text-gray-400">Glossary</p>
          <button onClick={() => setShowAddForm((v) => !v)} className="text-xs hover:underline">
            {showAddForm ? 'cancel' : '+ add word'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddWord} className="flex gap-2 mb-4">
            <input
              value={newIt}
              onChange={(e) => setNewIt(e.target.value)}
              placeholder="italiano"
              className="flex-1 border border-black px-2 py-1 text-sm focus:outline-none"
              autoFocus
            />
            <input
              value={newEn}
              onChange={(e) => setNewEn(e.target.value)}
              placeholder="english"
              className="flex-1 border border-black px-2 py-1 text-sm focus:outline-none"
            />
            <button type="submit" className="border border-black px-3 py-1 text-sm hover:bg-black hover:text-white">
              add
            </button>
          </form>
        )}

        {loadingWords ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([letter, entries]) => (
              <div key={letter} id={`letter-${letter}`}>
                <p className="text-xs font-bold text-gray-400 mb-1">{letter.toUpperCase()}</p>
                <div className="space-y-0.5">
                  {entries.map((w) => (
                    <div key={w.id}>
                      {editingId === w.id ? (
                        <div className="flex gap-2 items-center py-0.5">
                          <input
                            value={editIt}
                            onChange={(e) => setEditIt(e.target.value)}
                            className="flex-1 border border-black px-2 py-0.5 text-sm focus:outline-none"
                            autoFocus
                          />
                          <input
                            value={editEn}
                            onChange={(e) => setEditEn(e.target.value)}
                            className="flex-1 border border-black px-2 py-0.5 text-sm focus:outline-none"
                          />
                          <button onClick={saveEdit} className="text-xs hover:underline shrink-0">
                            save
                          </button>
                          <button onClick={cancelEdit} className="text-xs text-gray-400 hover:underline shrink-0">
                            cancel
                          </button>
                          <button
                            onClick={() => handleDeleteWord(w.id)}
                            className="text-xs text-gray-400 hover:underline shrink-0"
                          >
                            delete
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-0.5 group">
                          <button
                            onClick={() => setSelectedWord(w)}
                            className="flex-1 flex justify-between gap-2 text-left text-sm hover:underline"
                          >
                            <span>{w.it}</span>
                            <span className="text-gray-400">{w.en}</span>
                          </button>
                          <SpeakButton text={w.it} />
                          <button
                            onClick={() => startEdit(w)}
                            title="edit"
                            className="text-xs text-gray-300 hover:text-black shrink-0"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlphabetNav availableLetters={availableLetters} onSelect={scrollToLetter} />

      {selectedWord && <WordModal word={selectedWord} words={words} onClose={() => setSelectedWord(null)} />}
    </div>
  )
}
