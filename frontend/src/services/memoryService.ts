import type { 
  MemoryEntry, 
  MemorySearchQuery, 
  MemorySearchResult, 
  MemoryCreateRequest,
  MemoryUpdateRequest,
  UserLearningProfile,
  LearningRecommendation,
  MemoryService
} from '../types/memory';

class MemoryServiceImpl implements MemoryService {
  private baseUrl = '/api/memory';

  // 기본 CRUD 작업
  async createMemory(request: MemoryCreateRequest): Promise<MemoryEntry> {
    const response = await fetch(`${this.baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`메모리 생성 실패: ${response.statusText}`);
    }
    
    return response.json();
  }

  async searchMemories(query: MemorySearchQuery): Promise<MemorySearchResult> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    
    if (!response.ok) {
      throw new Error(`메모리 검색 실패: ${response.statusText}`);
    }
    
    return response.json();
  }

  async updateMemory(request: MemoryUpdateRequest): Promise<MemoryEntry> {
    const response = await fetch(`${this.baseUrl}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`메모리 업데이트 실패: ${response.statusText}`);
    }
    
    return response.json();
  }

  async deleteMemory(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`메모리 삭제 실패: ${response.statusText}`);
    }
  }

  // 사용자 프로필 관리
  async getUserProfile(userId: string): Promise<UserLearningProfile> {
    const response = await fetch(`${this.baseUrl}/profile/${userId}`);
    
    if (!response.ok) {
      throw new Error(`사용자 프로필 조회 실패: ${response.statusText}`);
    }
    
    return response.json();
  }

  async updateUserProfile(profile: Partial<UserLearningProfile>): Promise<UserLearningProfile> {
    const response = await fetch(`${this.baseUrl}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    
    if (!response.ok) {
      throw new Error(`사용자 프로필 업데이트 실패: ${response.statusText}`);
    }
    
    return response.json();
  }

  // 학습 패턴 분석
  async analyzeLearningPatterns(userId: string): Promise<LearningRecommendation[]> {
    const response = await fetch(`${this.baseUrl}/analyze/${userId}`);
    
    if (!response.ok) {
      throw new Error(`학습 패턴 분석 실패: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getPersonalizedContent(userId: string, contentType: string): Promise<MemoryEntry[]> {
    const response = await fetch(`${this.baseUrl}/personalized/${userId}?type=${contentType}`);
    
    if (!response.ok) {
      throw new Error(`개인화 콘텐츠 조회 실패: ${response.statusText}`);
    }
    
    return response.json();
  }

  // 어휘 관련 기능
  async addVocabularyMemory(vocabulary: any, userId: string, sessionId: string): Promise<MemoryEntry> {
    const memoryRequest: MemoryCreateRequest = {
      text: `한국어: ${vocabulary.original_word}, 러시아어: ${vocabulary.russian_translation}`,
      metadata: {
        type: 'vocabulary',
        language: 'mixed',
        difficulty_level: this.calculateDifficultyLevel(vocabulary),
        tags: [
          'vocabulary',
          vocabulary.original_word,
          vocabulary.russian_translation,
          ...this.extractTagsFromExamples(vocabulary.usage_examples)
        ],
        user_id: userId,
        session_id: sessionId
      }
    };
    
    return this.createMemory(memoryRequest);
  }

  async getVocabularyProgress(userId: string): Promise<{ learned: number; reviewing: number; mastered: number }> {
    const searchQuery: MemorySearchQuery = {
      query: '',
      filters: {
        type: 'vocabulary',
        user_id: userId
      },
      limit: 1000
    };
    
    const result = await this.searchMemories(searchQuery);
    
    // 간단한 진도 계산 (실제로는 더 복잡한 로직 필요)
    const total = result.memories.length;
    const learned = Math.floor(total * 0.7);
    const reviewing = Math.floor(total * 0.2);
    const mastered = total - learned - reviewing;
    
    return { learned, reviewing, mastered };
  }

  async getWeakVocabulary(userId: string): Promise<MemoryEntry[]> {
    const searchQuery: MemorySearchQuery = {
      query: 'weak difficult mistake',
      filters: {
        type: 'vocabulary',
        user_id: userId
      },
      limit: 10
    };
    
    return (await this.searchMemories(searchQuery)).memories;
  }

  // 대화 맥락 관리
  async addConversationContext(context: string, userId: string, sessionId: string): Promise<MemoryEntry> {
    const memoryRequest: MemoryCreateRequest = {
      text: context,
      metadata: {
        type: 'conversation',
        language: 'mixed',
        tags: ['conversation', 'context'],
        user_id: userId,
        session_id: sessionId
      }
    };
    
    return this.createMemory(memoryRequest);
  }

  async getRecentContext(userId: string, limit = 5): Promise<MemoryEntry[]> {
    const searchQuery: MemorySearchQuery = {
      query: '',
      filters: {
        type: 'conversation',
        user_id: userId
      },
      limit
    };
    
    return (await this.searchMemories(searchQuery)).memories;
  }

  // 메모리 정리 작업
  async cleanupOldMemories(userId: string, daysToKeep: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const response = await fetch(`${this.baseUrl}/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        cutoff_date: cutoffDate.toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`메모리 정리 실패: ${response.statusText}`);
    }
  }

  async consolidateMemories(userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/consolidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    
    if (!response.ok) {
      throw new Error(`메모리 통합 실패: ${response.statusText}`);
    }
  }

  // 헬퍼 메서드들
  private calculateDifficultyLevel(vocabulary: any): number {
    // 단어 길이, 예문 복잡도 등을 기반으로 난이도 계산
    const wordLength = vocabulary.original_word.length;
    const exampleCount = vocabulary.usage_examples?.length || 0;
    const hasSpellingError = vocabulary.spelling_check?.has_spelling_error || false;
    
    let difficulty = 1;
    
    if (wordLength > 10) difficulty += 1;
    if (exampleCount > 2) difficulty += 1;
    if (hasSpellingError) difficulty += 1;
    
    return Math.min(difficulty, 5);
  }

  private extractTagsFromExamples(examples: any[] = []): string[] {
    const tags: string[] = [];
    
    examples.forEach(example => {
      if (example.grammar_note) {
        tags.push(example.grammar_note);
      }
      if (example.context) {
        tags.push(example.context);
      }
    });
    
    return tags;
  }
}

// 싱글톤 인스턴스
export const memoryService = new MemoryServiceImpl();

// Hook for React components
export const useMemoryService = () => {
  return memoryService;
};