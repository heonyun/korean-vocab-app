// API 타입 정의 (기존 Pydantic 모델과 동일)

export interface SpellCheckInfo {
  original_word: string;
  corrected_word: string;
  has_spelling_error: boolean;
  correction_note?: string;
}

export interface UsageExample {
  korean_sentence: string;
  russian_translation: string;
  grammar_note: string;
  grammar_note_russian: string;
  context: string;
  context_russian?: string;
}

export interface VocabularyEntry {
  id?: string;
  original_word: string;
  russian_translation: string;
  pronunciation: string;
  usage_examples: UsageExample[];
  spelling_check?: SpellCheckInfo;
  created_at?: string;
}

export interface VocabularyRequest {
  word: string;
}

export interface VocabularyResponse {
  success: boolean;
  entry?: VocabularyEntry;
  error?: string;
}

export interface ChatMessage {
  id?: string;
  type: 'user' | 'ai' | 'system';
  text: string;
  created_at?: string;
  data?: VocabularyEntry; // AI 메시지의 경우 어휘 데이터
}

export interface ChatSession {
  session_id: string;
  title?: string;
  messages: ChatMessage[];
  created_at: string;
  last_updated: string;
  message_count: number;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  success: boolean;
  session_id: string;
  message?: ChatMessage;
  error?: string;
}

export interface BookmarkEntry {
  id: string;
  session_id: string;
  message_id: string;
  korean_text: string;
  russian_translation: string;
  pronunciation?: string;
  usage_examples: UsageExample[];
  created_at: string;
  next_review_date: string;
  review_count: number;
  difficulty_rating?: number;
}

export interface BookmarkRequest {
  session_id: string;
  message_id: string;
}

export interface BookmarkResponse {
  success: boolean;
  bookmark?: BookmarkEntry;
  error?: string;
}

export interface BookmarkListResponse {
  success: boolean;
  bookmarks: BookmarkEntry[];
  total_count: number;
  error?: string;
}