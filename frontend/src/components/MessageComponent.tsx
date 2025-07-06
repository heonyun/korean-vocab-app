import React, { useState } from 'react';
import { Message } from '@chatscope/chat-ui-kit-react';
import type { ChatMessage } from '../types/api';
import { Volume2, BookOpen } from 'lucide-react';
import { useBookmarkStore } from '../store/bookmarkStore';
import { clsx } from 'clsx';

interface MessageComponentProps {
  message: ChatMessage;
}

export const MessageComponent: React.FC<MessageComponentProps> = ({ message }) => {
  const [showExamples, setShowExamples] = useState(true);
  const { createBookmark, removeBookmark, isBookmarked } = useBookmarkStore();
  
  const bookmarked = message.data ? isBookmarked(message.id || '') : false;

  // TTS 음성 재생
  const playTTS = (text: string) => {
    try {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const voices = speechSynthesis.getVoices();
      const koreanVoice = voices.find(voice => 
        voice.lang.includes('ko') || voice.name.includes('Korean')
      );
      
      if (koreanVoice) {
        utterance.voice = koreanVoice;
      }
      
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('TTS 재생 실패:', error);
    }
  };

  // 북마크 토글
  const handleBookmarkToggle = async () => {
    if (!message.data || !message.id) return;
    
    try {
      if (bookmarked) {
        await removeBookmark(message.id);
      } else {
        await createBookmark({
          session_id: 'current', // TODO: 실제 세션 ID 사용
          message_id: message.id
        });
      }
    } catch (error) {
      console.error('북마크 토글 실패:', error);
    }
  };

  // 사용자 메시지
  if (message.type === 'user') {
    return (
      <Message
        model={{
          message: message.text,
          direction: 'outgoing',
          position: 'single'
        }}
        className="mb-4"
      />
    );
  }

  // 시스템 메시지
  if (message.type === 'system') {
    return (
      <div className="flex justify-center mb-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg text-sm">
          {message.text}
        </div>
      </div>
    );
  }

  // AI 메시지 (어휘 데이터 포함)
  if (message.type === 'ai' && message.data) {
    const vocab = message.data;
    
    return (
      <div className="mb-4">
        <Message
          model={{
            message: '',
            direction: 'incoming',
            position: 'single'
          }}
        >
          <Message.CustomContent>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              {/* 메인 번역 */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-blue-600 dark:text-blue-400 text-lg">
                    {vocab.original_word}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    {vocab.russian_translation}
                  </div>
                  {vocab.pronunciation && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      [{vocab.pronunciation}]
                    </div>
                  )}
                </div>
                
                {/* 액션 버튼들 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => playTTS(vocab.original_word)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="발음 듣기"
                  >
                    <Volume2 size={18} />
                  </button>
                  
                  <button
                    onClick={handleBookmarkToggle}
                    className={clsx(
                      'p-2 rounded-full transition-colors',
                      bookmarked
                        ? 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    title={bookmarked ? '북마크됨' : '북마크 추가'}
                  >
                    {bookmarked ? '🦊' : '🤍'}
                  </button>
                </div>
              </div>

              {/* 맞춤법 체크 */}
              {vocab.spelling_check?.has_spelling_error && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>맞춤법 교정:</strong> {vocab.spelling_check.original_word} → {vocab.spelling_check.corrected_word}
                  </div>
                  {vocab.spelling_check.correction_note && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                      {vocab.spelling_check.correction_note}
                    </div>
                  )}
                </div>
              )}

              {/* 예문 섹션 */}
              {vocab.usage_examples && vocab.usage_examples.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowExamples(!showExamples)}
                    className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <BookOpen size={14} />
                    📝 예문 {vocab.usage_examples.length}개 {showExamples ? '숨기기' : '보기'}
                  </button>
                  
                  {showExamples && (
                    <div className="mt-3 space-y-3">
                      {vocab.usage_examples.map((example, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {example.korean_sentence}
                            </div>
                            <button
                              onClick={() => playTTS(example.korean_sentence)}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="예문 발음 듣기"
                            >
                              <Volume2 size={14} />
                            </button>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                            {example.russian_translation}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            <div className="mb-1">
                              <span className="font-medium">상황:</span> {example.context}
                            </div>
                            {example.context_russian && (
                              <div className="text-blue-600 dark:text-blue-400 italic">
                                {example.context_russian}
                              </div>
                            )}
                            <div className="mt-1">
                              <span className="font-medium">문법:</span> {example.grammar_note}
                            </div>
                            <div className="text-blue-600 dark:text-blue-400 italic">
                              {example.grammar_note_russian}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Message.CustomContent>
        </Message>
      </div>
    );
  }

  // 기본 AI 메시지
  return (
    <Message
      model={{
        message: message.text,
        direction: 'incoming',
        position: 'single'
      }}
      className="mb-4"
    />
  );
};