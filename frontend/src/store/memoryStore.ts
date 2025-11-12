import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { memoryService } from '../services/memoryService';
import type { 
  MemoryEntry, 
  UserLearningProfile, 
  LearningRecommendation,
  MemorySearchQuery 
} from '../types/memory';

interface MemoryState {
  // 상태
  currentUser: string;
  userProfile: UserLearningProfile | null;
  recentMemories: MemoryEntry[];
  recommendations: LearningRecommendation[];
  vocabularyProgress: { learned: number; reviewing: number; mastered: number };
  loading: boolean;
  error: string | null;

  // 액션
  setCurrentUser: (userId: string) => void;
  initializeUser: (userId: string) => Promise<void>;
  addVocabularyToMemory: (vocabulary: any, sessionId: string) => Promise<void>;
  searchMemories: (query: MemorySearchQuery) => Promise<MemoryEntry[]>;
  updateUserPreferences: (preferences: Partial<UserLearningProfile['learning_preferences']>) => Promise<void>;
  getRecommendations: () => Promise<void>;
  addConversationContext: (context: string, sessionId: string) => Promise<void>;
  markVocabularyAsLearned: (vocabularyId: string) => Promise<void>;
  clearError: () => void;
}

export const useMemoryStore = create<MemoryState>()(
  devtools(
    (set, get) => ({
      // 초기 상태
      currentUser: '',
      userProfile: null,
      recentMemories: [],
      recommendations: [],
      vocabularyProgress: { learned: 0, reviewing: 0, mastered: 0 },
      loading: false,
      error: null,

      // 현재 사용자 설정
      setCurrentUser: (userId: string) => {
        set({ currentUser: userId });
      },

      // 사용자 초기화
      initializeUser: async (userId: string) => {
        set({ loading: true, error: null });
        
        try {
          // 사용자 프로필 로드
          const profile = await memoryService.getUserProfile(userId);
          
          // 최근 메모리 로드
          const recentMemories = await memoryService.getRecentContext(userId, 10);
          
          // 어휘 진도 로드
          const vocabularyProgress = await memoryService.getVocabularyProgress(userId);
          
          set({ 
            currentUser: userId,
            userProfile: profile,
            recentMemories,
            vocabularyProgress,
            loading: false 
          });

          // 추천 콘텐츠 비동기 로드
          get().getRecommendations();
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '사용자 초기화 실패',
            loading: false 
          });
        }
      },

      // 어휘를 메모리에 추가
      addVocabularyToMemory: async (vocabulary: any, sessionId: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
          await memoryService.addVocabularyMemory(vocabulary, currentUser, sessionId);
          
          // 어휘 진도 업데이트
          const vocabularyProgress = await memoryService.getVocabularyProgress(currentUser);
          set({ vocabularyProgress });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '어휘 메모리 추가 실패'
          });
        }
      },

      // 메모리 검색
      searchMemories: async (query: MemorySearchQuery) => {
        const { currentUser } = get();
        if (!currentUser) return [];

        try {
          // 사용자 필터 추가
          const searchQuery = {
            ...query,
            filters: {
              ...query.filters,
              user_id: currentUser
            }
          };

          const result = await memoryService.searchMemories(searchQuery);
          return result.memories;
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '메모리 검색 실패'
          });
          return [];
        }
      },

      // 사용자 선호도 업데이트
      updateUserPreferences: async (preferences: Partial<UserLearningProfile['learning_preferences']>) => {
        const { userProfile } = get();
        if (!userProfile) return;

        try {
          const updatedProfile = await memoryService.updateUserProfile({
            ...userProfile,
            learning_preferences: {
              ...userProfile.learning_preferences,
              ...preferences
            }
          });

          set({ userProfile: updatedProfile });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '사용자 선호도 업데이트 실패'
          });
        }
      },

      // 개인화 추천 가져오기
      getRecommendations: async () => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
          const recommendations = await memoryService.analyzeLearningPatterns(currentUser);
          set({ recommendations });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '추천 콘텐츠 로드 실패'
          });
        }
      },

      // 대화 맥락 추가
      addConversationContext: async (context: string, sessionId: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
          await memoryService.addConversationContext(context, currentUser, sessionId);
          
          // 최근 메모리 업데이트
          const recentMemories = await memoryService.getRecentContext(currentUser, 10);
          set({ recentMemories });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '대화 맥락 추가 실패'
          });
        }
      },

      // 어휘를 학습 완료로 표시
      markVocabularyAsLearned: async (vocabularyId: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
          // 메모리 업데이트 (학습 완료 태그 추가)
          await memoryService.updateMemory({
            id: vocabularyId,
            metadata: {
              tags: ['learned', 'mastered']
            }
          });

          // 어휘 진도 업데이트
          const vocabularyProgress = await memoryService.getVocabularyProgress(currentUser);
          set({ vocabularyProgress });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '어휘 학습 완료 표시 실패'
          });
        }
      },

      // 에러 클리어
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'memory-store'
    }
  )
);