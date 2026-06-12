export type Direction = 'it-en' | 'en-it'

export interface Meaning {
  partOfSpeech: string
  definitions: string[]
  examples: string[]
}

export interface DictionaryEntry {
  word: string
  translation: string | null
  phonetic: string | null
  meanings: Meaning[]
}

interface MyMemoryResponse {
  responseData?: { translatedText?: string }
}

interface DictionaryApiEntry {
  phonetic?: string
  meanings?: {
    partOfSpeech?: string
    definitions?: { definition?: string; example?: string }[]
  }[]
}

/**
 * Translation via MyMemory (free, no API key) and definitions via
 * dictionaryapi.dev (free, no API key, supports 'it' and 'en').
 */
export async function lookupWord(word: string, direction: Direction): Promise<DictionaryEntry> {
  const trimmed = word.trim()
  const [source] = direction.split('-')
  const langpair = direction === 'it-en' ? 'it|en' : 'en|it'

  const [translationResult, definitionResult] = await Promise.allSettled([
    fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${langpair}`,
    ).then((r) => r.json() as Promise<MyMemoryResponse>),
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/${source}/${encodeURIComponent(trimmed)}`).then(
      (r) => {
        if (!r.ok) return null
        return r.json() as Promise<DictionaryApiEntry[]>
      },
    ),
  ])

  const translation =
    translationResult.status === 'fulfilled'
      ? translationResult.value.responseData?.translatedText ?? null
      : null

  let phonetic: string | null = null
  let meanings: Meaning[] = []

  if (definitionResult.status === 'fulfilled' && definitionResult.value) {
    const entries = definitionResult.value
    phonetic = entries.find((e) => e.phonetic)?.phonetic ?? null
    meanings = entries.flatMap(
      (e) =>
        e.meanings?.map((m) => ({
          partOfSpeech: m.partOfSpeech ?? '',
          definitions: (m.definitions ?? []).map((d) => d.definition ?? '').filter(Boolean),
          examples: (m.definitions ?? []).map((d) => d.example ?? '').filter(Boolean),
        })) ?? [],
    )
  }

  return {
    word: trimmed,
    translation,
    phonetic,
    meanings,
  }
}

/** Translate a full sentence via MyMemory. */
export async function translateText(text: string, direction: Direction): Promise<string | null> {
  const langpair = direction === 'it-en' ? 'it|en' : 'en|it'
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`,
  )
  if (!res.ok) return null
  const data = (await res.json()) as MyMemoryResponse
  return data.responseData?.translatedText ?? null
}
