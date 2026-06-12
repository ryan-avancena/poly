export interface Word {
  id: string
  it: string
  en: string
  created_at: string
}

export interface Sentence {
  id: string
  word_id: string
  target_text: string
  native_text: string | null
  notes: string | null
  created_at: string
}
