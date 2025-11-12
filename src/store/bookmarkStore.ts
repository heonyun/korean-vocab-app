import { create } from 'zustand';
import { BookmarkEntry, BookmarkRequest } from '../types/api';
import { apiService } from '../services/api';

interface BookmarkState {
  bookmarks: BookmarkEntry[];
  reviewBookmarks: BookmarkEntry[];
  isLoading: boolean;
  
  // Actions
  setBookmarks: (bookmarks: BookmarkEntry[]) => void;
  setReviewBookmarks: (bookmarks: BookmarkEntry[]) => void;
  setIsLoading: (loading: boolean) => void;
  
  // Helper functions
  isBookmarked: (messageId: string) => boolean;
  
  // Async actions
  loadBookmarks: () => Promise<void>;
  loadReviewBookmarks: () => Promise<void>;
  createBookmark: (request: BookmarkRequest) => Promise<void>;
  removeBookmark: (messageId: string) => Promise<void>;
  deleteBookmark: (bookmarkId: string) => Promise<void>;
  completeReview: (bookmarkId: string, difficultyRating: number) => Promise<void>;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  // Initial state
  bookmarks: [],
  reviewBookmarks: [],
  isLoading: false,

  // Setters
  setBookmarks: (bookmarks) => set({ bookmarks }),
  setReviewBookmarks: (bookmarks) => set({ reviewBookmarks: bookmarks }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Helper functions
  isBookmarked: (messageId: string) => {
    const { bookmarks } = get();
    return bookmarks.some(bookmark => bookmark.message_id === messageId);
  },

  // Async actions
  loadBookmarks: async () => {
    const { setIsLoading, setBookmarks } = get();
    
    try {
      setIsLoading(true);
      const response = await apiService.getBookmarks();
      
      if (response.success) {
        setBookmarks(response.bookmarks);
      }
    } catch (error) {
      console.error('북마크 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  },

  loadReviewBookmarks: async () => {
    const { setIsLoading, setReviewBookmarks } = get();
    
    try {
      setIsLoading(true);
      const response = await apiService.getReviewBookmarks();
      
      if (response.success) {
        setReviewBookmarks(response.bookmarks);
      }
    } catch (error) {
      console.error('복습 북마크 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  },

  createBookmark: async (request: BookmarkRequest) => {
    try {
      const response = await apiService.createBookmark(request);
      
      if (response.success && response.bookmark) {
        // 북마크 목록에 추가
        set(state => ({
          bookmarks: [...state.bookmarks, response.bookmark!]
        }));
      }
    } catch (error) {
      console.error('북마크 생성 오류:', error);
      throw error;
    }
  },

  removeBookmark: async (messageId: string) => {
    const { bookmarks } = get();
    const bookmark = bookmarks.find(b => b.message_id === messageId);
    
    if (!bookmark) return;
    
    try {
      const response = await apiService.removeBookmark({
        session_id: bookmark.session_id,
        message_id: messageId
      });
      
      if (response.success) {
        // 북마크 목록에서 제거
        set(state => ({
          bookmarks: state.bookmarks.filter(b => b.message_id !== messageId)
        }));
      }
    } catch (error) {
      console.error('북마크 제거 오류:', error);
      throw error;
    }
  },

  deleteBookmark: async (bookmarkId: string) => {
    try {
      const response = await apiService.deleteBookmark(bookmarkId);
      
      if (response.success) {
        // 북마크 목록에서 제거
        set(state => ({
          bookmarks: state.bookmarks.filter(b => b.id !== bookmarkId),
          reviewBookmarks: state.reviewBookmarks.filter(b => b.id !== bookmarkId)
        }));
      }
    } catch (error) {
      console.error('북마크 삭제 오류:', error);
      throw error;
    }
  },

  completeReview: async (bookmarkId: string, difficultyRating: number) => {
    try {
      const response = await apiService.completeReview(bookmarkId, difficultyRating);
      
      if (response.success) {
        // 복습 목록에서 제거 (다음 복습 일정으로 이동)
        set(state => ({
          reviewBookmarks: state.reviewBookmarks.filter(b => b.id !== bookmarkId)
        }));
        
        // 전체 북마크 목록 새로고침
        get().loadBookmarks();
      }
    } catch (error) {
      console.error('복습 완료 처리 오류:', error);
      throw error;
    }
  }
}));