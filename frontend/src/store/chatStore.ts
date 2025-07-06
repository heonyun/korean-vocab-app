import { create } from 'zustand';
import type { ChatMessage, ChatSession } from '../types/api';
import { apiService } from '../services/api';

interface ChatState {
  // 현재 세션
  currentSession: ChatSession | null;
  currentSessionId: string | null;
  
  // 메시지
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  
  // 세션 목록
  sessions: ChatSession[];
  
  // UI 상태
  isSidebarOpen: boolean;
  
  // Actions
  setCurrentSession: (session: ChatSession | null) => void;
  addMessage: (message: ChatMessage) => void;
  setIsLoading: (loading: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Async Actions
  sendMessage: (text: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  createNewSession: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  currentSession: null,
  currentSessionId: null,
  messages: [],
  isLoading: false,
  isTyping: false,
  sessions: [],
  isSidebarOpen: true,

  // Setters
  setCurrentSession: (session) => set({ 
    currentSession: session,
    currentSessionId: session?.session_id || null,
    messages: session?.messages || []
  }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsTyping: (typing) => set({ isTyping: typing }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  // Async actions
  sendMessage: async (text: string) => {
    const { currentSessionId, addMessage, setIsLoading, setIsTyping } = get();
    
    try {
      setIsLoading(true);
      
      // 사용자 메시지 추가
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        text,
        created_at: new Date().toISOString()
      };
      addMessage(userMessage);
      
      // 타이핑 인디케이터 표시
      setIsTyping(true);
      
      // API 호출
      const response = await apiService.sendChatMessage({
        message: text,
        session_id: currentSessionId || undefined
      });
      
      if (response.success && response.message) {
        // 세션 ID 업데이트
        set({ currentSessionId: response.session_id });
        
        // AI 응답 추가
        addMessage(response.message);
      } else {
        // 에러 메시지 추가
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'system',
          text: `오류: ${response.error || '알 수 없는 오류'}`,
          created_at: new Date().toISOString()
        };
        addMessage(errorMessage);
      }
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'system',
        text: '네트워크 오류가 발생했습니다. 다시 시도해주세요.',
        created_at: new Date().toISOString()
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  },

  loadSession: async (sessionId: string) => {
    try {
      const session = await apiService.getChatSession(sessionId);
      get().setCurrentSession(session);
    } catch (error) {
      console.error('세션 로드 오류:', error);
    }
  },

  loadSessions: async () => {
    try {
      const response = await apiService.getChatSessions();
      if (response.success) {
        set({ sessions: response.sessions });
      }
    } catch (error) {
      console.error('세션 목록 로드 오류:', error);
    }
  },

  createNewSession: async () => {
    try {
      const response = await apiService.createChatSession();
      if (response.success) {
        // 새 세션 설정
        set({ 
          currentSessionId: response.session_id,
          messages: response.message ? [response.message] : []
        });
        
        // 세션 목록 새로고침
        get().loadSessions();
      }
    } catch (error) {
      console.error('새 세션 생성 오류:', error);
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      const response = await apiService.deleteChatSession(sessionId);
      if (response.success) {
        // 현재 세션이 삭제된 세션이면 초기화
        const { currentSessionId } = get();
        if (currentSessionId === sessionId) {
          set({
            currentSession: null,
            currentSessionId: null,
            messages: []
          });
        }
        
        // 세션 목록 새로고침
        get().loadSessions();
      }
    } catch (error) {
      console.error('세션 삭제 오류:', error);
    }
  }
}));