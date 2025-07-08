import React, { useState, useCallback } from 'react';
import { Volume2, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import type { VocabularyEntry } from '../types/api';
import { useBookmarkStore } from '../store/bookmarkStore';

interface VocabularyCardProps {
  vocabulary: VocabularyEntry;
  compact?: boolean;
  loading?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: (vocabulary: VocabularyEntry) => void;
}

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  vocabulary,
  compact = false,
  loading = false,
  selected = false,
  disabled = false,
  onClick
}) => {
  const [showExamples, setShowExamples] = useState(false);
  const { createBookmark, removeBookmark, isBookmarked } = useBookmarkStore();
  
  const bookmarked = isBookmarked(vocabulary.id || '');

  // TTS 음성 재생 (메모이제이션)
  const playTTS = useCallback((text: string) => {
    if (disabled) return;
    
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
  }, [disabled]);

  // 북마크 토글 (메모이제이션)
  const handleBookmarkToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !vocabulary.id) return;
    
    try {
      if (bookmarked) {
        await removeBookmark(vocabulary.id);
      } else {
        await createBookmark({
          session_id: 'current',
          message_id: vocabulary.id
        });
      }
    } catch (error) {
      console.error('북마크 토글 실패:', error);
    }
  }, [disabled, vocabulary.id, bookmarked, removeBookmark, createBookmark]);

  // 예문 토글 (메모이제이션)
  const handleExampleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowExamples(!showExamples);
  }, [showExamples]);

  // 카드 클릭 핸들러 (메모이제이션)
  const handleCardClick = useCallback(() => {
    if (onClick && !disabled) {
      onClick(vocabulary);
    }
  }, [onClick, disabled, vocabulary]);

  // 로딩 상태
  if (loading) {
    return (
      <div 
        data-testid="vocabulary-card-loading"
        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm animate-pulse"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <div className="mt-2 text-center text-gray-500 dark:text-gray-400 text-sm">
          로딩 중...
        </div>
      </div>
    );
  }

  // 컴팩트 모드
  if (compact) {
    return (
      <div 
        data-testid="vocabulary-card-compact"
        className={clsx(
          'bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border',
          selected && 'ring-2 ring-blue-500',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && onClick && 'cursor-pointer hover:shadow-md',
          'transition-all duration-200'
        )}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {vocabulary.original_word}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {vocabulary.russian_translation}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); playTTS(vocabulary.original_word); }}
            disabled={disabled}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="발음 듣기"
            tabIndex={0}
            aria-label="한국어 단어 발음 재생"
          >
            <Volume2 size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 기본 카드 모드
  return (
    <div 
      data-testid="vocabulary-card"
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border',
        selected && 'ring-2 ring-blue-500',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && onClick && 'cursor-pointer hover:shadow-md',
        'transition-all duration-200'
      )}
      onClick={handleCardClick}
    >
      {/* 메인 어휘 정보 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="font-semibold text-blue-600 dark:text-blue-400 text-lg">
            {vocabulary.original_word}
          </div>
          <div className="text-gray-700 dark:text-gray-300">
            {vocabulary.russian_translation}
          </div>
          {vocabulary.pronunciation && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {vocabulary.pronunciation}
            </div>
          )}
        </div>
        
        {/* 액션 버튼들 */}
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); playTTS(vocabulary.original_word); }}
            disabled={disabled}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="발음 듣기"
            tabIndex={0}
            aria-label="한국어 단어 발음 재생"
          >
            <Volume2 size={18} />
          </button>
          
          <button
            onClick={handleBookmarkToggle}
            disabled={disabled}
            className={clsx(
              'p-2 rounded-full transition-colors disabled:opacity-50',
              bookmarked
                ? 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            title={bookmarked ? '북마크됨' : '북마크 추가'}
            tabIndex={0}
            aria-label="어휘 북마크 토글"
          >
            {bookmarked ? '🦊' : '🤍'}
          </button>
        </div>
      </div>

      {/* 맞춤법 교정 */}
      {vocabulary.spelling_check?.has_spelling_error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>맞춤법 교정:</strong> {vocabulary.spelling_check.original_word} → {vocabulary.spelling_check.corrected_word}
          </div>
          {vocabulary.spelling_check.correction_note && (
            <div className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
              {vocabulary.spelling_check.correction_note}
            </div>
          )}
        </div>
      )}

      {/* 예문 섹션 */}
      {vocabulary.usage_examples && vocabulary.usage_examples.length > 0 && (
        <div className="mt-4">
          <button
            onClick={handleExampleToggle}
            className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            tabIndex={0}
            aria-label="사용 예문 토글"
          >
            <BookOpen size={14} />
            예문 {vocabulary.usage_examples.length}개 {showExamples ? '숨기기' : '보기'}
          </button>
          
          {showExamples && (
            <div className="mt-3 space-y-3">
              {vocabulary.usage_examples.map((example, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {example.korean_sentence}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); playTTS(example.korean_sentence); }}
                      disabled={disabled}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
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
  );
};