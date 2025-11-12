// mem0 메모리 시스템 타입 정의

export interface MemoryEntry {
  id: string;
  text: string;
  metadata: {
    type: 'vocabulary' | 'conversation' | 'user_preference' | 'learning_pattern';
    language: 'ko' | 'ru' | 'mixed';
    difficulty_level?: number;
    tags: string[];
    created_at: string;
    updated_at: string;
    user_id: string;
    session_id: string;
  };
  embedding?: number[];
  score?: number;
}

export interface UserLearningProfile {
  user_id: string;
  learning_preferences: {
    preferred_difficulty: number;
    study_time_preference: 'morning' | 'afternoon' | 'evening' | 'flexible';
    learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
    review_frequency: 'daily' | 'weekly' | 'flexible';
  };
  vocabulary_progress: {
    total_learned: number;
    mastery_level: number;
    weak_areas: string[];
    strong_areas: string[];
  };
  learning_patterns: {
    most_active_time: string;
    average_session_duration: number;
    preferred_topics: string[];
    common_mistakes: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface MemorySearchQuery {
  query: string;
  filters?: {
    type?: MemoryEntry['metadata']['type'];
    language?: MemoryEntry['metadata']['language'];
    user_id?: string;
    session_id?: string;
    tags?: string[];
    date_range?: {
      start: string;
      end: string;
    };
  };
  limit?: number;
  threshold?: number;
}

export interface MemorySearchResult {
  memories: MemoryEntry[];
  total_count: number;
  search_metadata: {
    query: string;
    execution_time: number;
    filters_applied: string[];
  };
}

export interface MemoryCreateRequest {
  text: string;
  metadata: Omit<MemoryEntry['metadata'], 'created_at' | 'updated_at'>;
}

export interface MemoryUpdateRequest {
  id: string;
  text?: string;
  metadata?: Partial<MemoryEntry['metadata']>;
}

export interface LearningRecommendation {
  type: 'vocabulary_review' | 'new_topic' | 'grammar_practice' | 'conversation_practice';
  title: string;
  description: string;
  content: {
    vocabulary_items?: string[];
    topics?: string[];
    difficulty_level: number;
    estimated_time: number;
  };
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  based_on_memories: string[];
}

export interface MemoryService {
  // 기본 CRUD
  createMemory: (request: MemoryCreateRequest) => Promise<MemoryEntry>;
  searchMemories: (query: MemorySearchQuery) => Promise<MemorySearchResult>;
  updateMemory: (request: MemoryUpdateRequest) => Promise<MemoryEntry>;
  deleteMemory: (id: string) => Promise<void>;

  // 사용자 프로필
  getUserProfile: (userId: string) => Promise<UserLearningProfile>;
  updateUserProfile: (profile: Partial<UserLearningProfile>) => Promise<UserLearningProfile>;

  // 학습 패턴 분석
  analyzeLearningPatterns: (userId: string) => Promise<LearningRecommendation[]>;
  getPersonalizedContent: (userId: string, contentType: string) => Promise<MemoryEntry[]>;

  // 어휘 관련
  addVocabularyMemory: (vocabulary: any, userId: string, sessionId: string) => Promise<MemoryEntry>;
  getVocabularyProgress: (userId: string) => Promise<{ learned: number; reviewing: number; mastered: number }>;
  getWeakVocabulary: (userId: string) => Promise<MemoryEntry[]>;

  // 대화 맥락 관리
  addConversationContext: (context: string, userId: string, sessionId: string) => Promise<MemoryEntry>;
  getRecentContext: (userId: string, limit?: number) => Promise<MemoryEntry[]>;
  
  // 자동 메모리 정리
  cleanupOldMemories: (userId: string, daysToKeep: number) => Promise<void>;
  consolidateMemories: (userId: string) => Promise<void>;
}