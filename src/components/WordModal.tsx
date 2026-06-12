import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { translateText } from '../lib/dictionary'
import { getWordAtCursor, replaceWordAtCursor, suggestWords } from '../lib/wordlist'
import type { Sentence, Word } from '../lib/types'
import Modal from './Modal'
import SpeakButton from './SpeakButton'

interface WordModalProps {
  word: Word
  words: Word[]
  onClose: () => void
}

export default function WordModal({ word, words, onClose }: WordModalProps) {
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [targetText, setTargetText] = useState('')
  const [nativeText, setNativeText] = useState('')
  const [notes, setNotes] = useState('')
  const [translating, setTranslating] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [wordRange, setWordRange] = useState<{ start: number; end: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState('')
  const [editNative, setEditNative] = useState('')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    loadSentences()
  }, [word.id])

  async function loadSentences() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sentences')
      .select('*')
      .eq('word_id', word.id)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setSentences(data as Sentence[])
    setLoading(false)
  }

  function updateSuggestions(text: string, cursor: number) {
    const { word: w, start } = getWordAtCursor(text, cursor)
    if (!w) {
      setSuggestions([])
      setWordRange(null)
      return
    }
    setSuggestions(suggestWords(w, 'it', words))
    setWordRange({ start, end: cursor })
  }

  function handleTargetChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTargetText(e.target.value)
    updateSuggestions(e.target.value, e.target.selectionStart)
  }

  function handleSuggestionClick(suggestion: string) {
    if (!wordRange) return
    const { text, cursor } = replaceWordAtCursor(targetText, wordRange.start, wordRange.end, suggestion)
    setTargetText(text)
    setSuggestions([])
    setWordRange(null)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(cursor, cursor)
    })
  }

  async function handleTranslate() {
    if (!targetText.trim()) return
    setTranslating(true)
    try {
      const result = await translateText(targetText, 'it-en')
      if (result) setNativeText(result)
    } finally {
      setTranslating(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!targetText.trim()) return

    const { error } = await supabase.from('sentences').insert({
      word_id: word.id,
      target_text: targetText.trim(),
      native_text: nativeText.trim() || null,
      notes: notes.trim() || null,
    })

    if (error) {
      setError(error.message)
      return
    }

    setTargetText('')
    setNativeText('')
    setNotes('')
    loadSentences()
  }

  function startEdit(s: Sentence) {
    setEditingId(s.id)
    setEditTarget(s.target_text)
    setEditNative(s.native_text ?? '')
    setEditNotes(s.notes ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editingId || !editTarget.trim()) return

    const { error } = await supabase
      .from('sentences')
      .update({
        target_text: editTarget.trim(),
        native_text: editNative.trim() || null,
        notes: editNotes.trim() || null,
      })
      .eq('id', editingId)

    if (error) {
      setError(error.message)
      return
    }

    setEditingId(null)
    loadSentences()
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('sentences').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setSentences((s) => s.filter((x) => x.id !== id))
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          {word.it} — {word.en}
          <SpeakButton text={word.it} />
        </span>
      }
      onClose={onClose}
    >
      {error && <p className="text-sm text-gray-500 mb-2">Error: {error}</p>}

      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Example sentences</p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : sentences.length === 0 ? (
        <p className="text-sm text-gray-500 mb-3">No example sentences yet.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {sentences.map((s) => (
            <div key={s.id} className="border-b border-gray-200 pb-2">
              {editingId === s.id ? (
                <div className="space-y-1">
                  <textarea
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    rows={2}
                    className="w-full border border-black px-2 py-1 text-sm focus:outline-none"
                  />
                  <input
                    value={editNative}
                    onChange={(e) => setEditNative(e.target.value)}
                    placeholder="English translation"
                    className="w-full border border-black px-2 py-1 text-sm focus:outline-none"
                  />
                  <input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Notes"
                    className="w-full border border-black px-2 py-1 text-sm focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="text-xs hover:underline">
                      save
                    </button>
                    <button onClick={cancelEdit} className="text-xs text-gray-400 hover:underline">
                      cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm flex items-center gap-2">
                      {s.target_text}
                      <SpeakButton text={s.target_text} />
                    </p>
                    {s.native_text && <p className="text-sm text-gray-500">{s.native_text}</p>}
                    {s.notes && <p className="text-xs text-gray-400">{s.notes}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(s)}
                      title="edit"
                      className="text-xs text-gray-400 hover:text-black"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      title="delete"
                      className="text-xs text-gray-400 hover:text-black"
                    >
                      delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-2">
        <textarea
          ref={textareaRef}
          value={targetText}
          onChange={handleTargetChange}
          onClick={(e) => updateSuggestions(targetText, e.currentTarget.selectionStart)}
          onKeyUp={(e) => updateSuggestions(targetText, e.currentTarget.selectionStart)}
          onBlur={() => setTimeout(() => setSuggestions([]), 100)}
          placeholder={`Scrivi una frase con "${word.it}"...`}
          rows={2}
          className="w-full border border-black px-2 py-1 text-sm focus:outline-none"
        />
        <div className="flex gap-1 flex-wrap min-h-[22px]">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSuggestionClick(s)}
              className="border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:border-black hover:text-black"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={nativeText}
            onChange={(e) => setNativeText(e.target.value)}
            placeholder="English translation (optional)"
            className="flex-1 border border-black px-2 py-1 text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={handleTranslate}
            disabled={translating}
            className="border border-black px-2 py-1 text-xs hover:bg-black hover:text-white disabled:opacity-50"
          >
            {translating ? '...' : 'translate'}
          </button>
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full border border-black px-2 py-1 text-sm focus:outline-none"
        />
        <button type="submit" className="border border-black px-3 py-1 text-sm hover:bg-black hover:text-white">
          add sentence
        </button>
      </form>
    </Modal>
  )
}
