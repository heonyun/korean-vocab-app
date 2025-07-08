import React, { useMemo } from 'react';
import { VocabularyCard } from './VocabularyCard';
import type { VocabularyEntry } from '../types/api';

interface VocabularyCardListProps {
  vocabularies: VocabularyEntry[];
  loading?: boolean;
  compact?: boolean;
  selectedId?: string;
  onCardClick?: (vocabulary: VocabularyEntry) => void;
  onBookmarkToggle?: (vocabularyId: string) => void;
  filterQuery?: string;
  sortBy?: 'recent' | 'alphabetical' | 'bookmark';
}

export const VocabularyCardList: React.FC<VocabularyCardListProps> = ({
  vocabularies,
  loading = false,
  compact = false,
  selectedId,
  onCardClick,
  filterQuery = '',
  sortBy = 'recent'
}) => {
  // 필터링 및 정렬
  const filteredAndSorted = useMemo(() => {
    let filtered = vocabularies;

    // 검색 필터
    if (filterQuery.trim()) {
      const query = filterQuery.toLowerCase();
      filtered = vocabularies.filter(vocab =>
        vocab.original_word.toLowerCase().includes(query) ||
        vocab.russian_translation.toLowerCase().includes(query) ||
        vocab.usage_examples.some(example =>
          example.korean_sentence.toLowerCase().includes(query) ||
          example.russian_translation.toLowerCase().includes(query)
        )
      );
    }

    // 정렬
    switch (sortBy) {
      case 'alphabetical':
        return [...filtered].sort((a, b) => 
          a.original_word.localeCompare(b.original_word)
        );
      case 'recent':
        return [...filtered].sort((a, b) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
      default:
        return filtered;
    }
  }, [vocabularies, filterQuery, sortBy]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, index) => (
          <VocabularyCard
            key={`loading-${index}`}
            vocabulary={{} as VocabularyEntry}
            loading
            compact={compact}
          />
        ))}
      </div>
    );
  }

  // 빈 상태
  if (filteredAndSorted.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-gray-600 text-lg mb-2">
          📚
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          {filterQuery.trim() ? '검색 결과가 없습니다' : '저장된 어휘가 없습니다'}
        </div>
        {filterQuery.trim() && (
          <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            '{filterQuery}' 검색어와 일치하는 어휘를 찾을 수 없습니다
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {filteredAndSorted.map((vocabulary) => (
        <VocabularyCard
          key={vocabulary.id || vocabulary.original_word}
          vocabulary={vocabulary}
          compact={compact}
          selected={selectedId === vocabulary.id}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
};