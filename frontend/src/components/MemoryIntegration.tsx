import React, { useEffect } from 'react';
import { useMemoryStore } from '../store/memoryStore';
import { useChatStore } from '../store/chatStore';
import type { ChatMessage, VocabularyEntry } from '../types/api';

interface MemoryIntegrationProps {
  children: React.ReactNode;
  userId: string;
}

/**
 * 메모리 시스템 통합 컴포넌트
 * 채팅 및 어휘 학습 활동을 자동으로 메모리에 저장
 */
export const MemoryIntegration: React.FC<MemoryIntegrationProps> = ({ 
  children, 
  userId 
}) => {
  const { 
    initializeUser, 
    addVocabularyToMemory, 
    addConversationContext,
    clearError,
    error
  } = useMemoryStore();
  
  const { 
    messages, 
    currentSessionId 
  } = useChatStore();

  // 사용자 초기화
  useEffect(() => {
    if (userId) {
      initializeUser(userId);
    }
  }, [userId, initializeUser]);

  // 새 메시지 감지 및 메모리 저장
  useEffect(() => {
    if (messages.length === 0 || !currentSessionId) return;

    const lastMessage = messages[messages.length - 1];
    
    // AI 메시지이고 어휘 데이터가 있는 경우
    if (lastMessage.type === 'ai' && lastMessage.data) {
      handleVocabularyMemory(lastMessage.data, currentSessionId);
    }

    // 사용자 또는 AI 메시지인 경우 대화 맥락 저장
    if (lastMessage.type === 'user' || lastMessage.type === 'ai') {
      handleConversationMemory(lastMessage, currentSessionId);
    }
  }, [messages, currentSessionId]);

  // 어휘 메모리 처리
  const handleVocabularyMemory = async (vocabulary: VocabularyEntry, sessionId: string) => {
    try {
      await addVocabularyToMemory(vocabulary, sessionId);
    } catch (error) {
      console.error('어휘 메모리 저장 실패:', error);
    }
  };

  // 대화 맥락 메모리 처리
  const handleConversationMemory = async (message: ChatMessage, sessionId: string) => {
    try {
      const context = `${message.type}: ${message.text}`;
      await addConversationContext(context, sessionId);
    } catch (error) {
      console.error('대화 맥락 저장 실패:', error);
    }
  };

  // 에러 표시 (선택적)
  useEffect(() => {
    if (error) {
      console.warn('Memory system error:', error);
      
      // 5초 후 자동으로 에러 클리어
      const timer = setTimeout(() => {
        clearError();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return <>{children}</>;
};