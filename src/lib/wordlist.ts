import type { Word } from './types'

export type WordField = 'it' | 'en'

/** Suggest words from `words` whose given field starts with `prefix`. */
export function suggestWords(prefix: string, field: WordField, words: Word[], limit = 6): string[] {
  const p = prefix.trim().toLowerCase()
  if (!p) return []

  const seen = new Set<string>()
  const results: string[] = []

  for (const entry of words) {
    const value = entry[field]
    const lower = value.toLowerCase()
    if (lower.startsWith(p) && lower !== p && !seen.has(lower)) {
      seen.add(lower)
      results.push(value)
      if (results.length >= limit) break
    }
  }

  return results
}

/** Find the word being typed immediately before `cursor` in `text`. */
export function getWordAtCursor(text: string, cursor: number): { word: string; start: number } {
  const before = text.slice(0, cursor)
  const match = before.match(/[\p{L}'À-ÿ]+$/u)
  if (!match) return { word: '', start: cursor }
  return { word: match[0], start: cursor - match[0].length }
}

/** Replace the word at [start, cursor) in `text` with `replacement` (plus a trailing space). */
export function replaceWordAtCursor(
  text: string,
  start: number,
  cursor: number,
  replacement: string,
): { text: string; cursor: number } {
  const newText = text.slice(0, start) + replacement + ' ' + text.slice(cursor)
  return { text: newText, cursor: start + replacement.length + 1 }
}
