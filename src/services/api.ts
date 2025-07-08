import {
  VocabularyRequest,
  VocabularyResponse,
  ChatRequest,
  ChatResponse,
  ChatSession,
  BookmarkRequest,
  BookmarkResponse,
  BookmarkListResponse
} from '../types/api';

const API_BASE = '/api'; // Vite 프록시를 통해 FastAPI로 전달

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // 어휘 생성
  async generateVocabulary(request: VocabularyRequest): Promise<VocabularyResponse> {
    return this.request<VocabularyResponse>('/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 채팅 메시지 전송
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat/send', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 채팅 세션 목록 가져오기
  async getChatSessions(): Promise<{ success: boolean; sessions: ChatSession[] }> {
    return this.request<{ success: boolean; sessions: ChatSession[] }>('/chat/sessions');
  }

  // 특정 채팅 세션 가져오기
  async getChatSession(sessionId: string): Promise<ChatSession> {
    return this.request<ChatSession>(`/chat/sessions/${sessionId}`);
  }

  // 새 채팅 세션 생성
  async createChatSession(): Promise<{ success: boolean; session_id: string; message?: any }> {
    return this.request<{ success: boolean; session_id: string; message?: any }>('/chat/sessions/new', {
      method: 'POST',
    });
  }

  // 채팅 세션 삭제
  async deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // 북마크 생성
  async createBookmark(request: BookmarkRequest): Promise<BookmarkResponse> {
    return this.request<BookmarkResponse>('/bookmarks/create', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 북마크 제거
  async removeBookmark(request: BookmarkRequest): Promise<BookmarkResponse> {
    return this.request<BookmarkResponse>('/bookmarks/remove', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 북마크 목록 가져오기
  async getBookmarks(): Promise<BookmarkListResponse> {
    return this.request<BookmarkListResponse>('/bookmarks');
  }

  // 복습용 북마크 가져오기
  async getReviewBookmarks(): Promise<BookmarkListResponse> {
    return this.request<BookmarkListResponse>('/bookmarks/review');
  }

  // 북마크 삭제
  async deleteBookmark(bookmarkId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
    });
  }

  // 복습 완료 처리
  async completeReview(
    bookmarkId: string,
    difficultyRating: number
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/bookmarks/${bookmarkId}/review`, {
      method: 'POST',
      body: JSON.stringify({ difficulty_rating: difficultyRating }),
    });
  }
}

export const apiService = new ApiService();