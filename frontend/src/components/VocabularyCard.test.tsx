import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/utils'
import { mockStores } from '../test/utils'
import { VocabularyCard } from './VocabularyCard'
import type { VocabularyEntry } from '../types/api'

// Mock Zustand 스토어
vi.mock('../store/bookmarkStore')

describe('VocabularyCard', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useBookmarkStore } = await import('../store/bookmarkStore')
    vi.mocked(useBookmarkStore).mockReturnValue(mockStores.bookmark)
  })

  const mockVocabulary: VocabularyEntry = {
    id: 'vocab-1',
    original_word: '안녕하세요',
    russian_translation: 'Здравствуйте',
    pronunciation: '[здравствуйте]',
    usage_examples: [
      {
        korean_sentence: '안녕하세요, 만나서 반가워요.',
        russian_translation: 'Здравствуйте, рад познакомиться.',
        grammar_note: '정중한 인사말',
        grammar_note_russian: 'Вежливое приветствие',
        context: '처음 만나는 사람에게',
        context_russian: 'При первой встрече'
      },
      {
        korean_sentence: '안녕하세요, 어떻게 지내세요?',
        russian_translation: 'Здравствуйте, как дела?',
        grammar_note: '안부 인사',
        grammar_note_russian: 'Приветствие с вопросом о делах',
        context: '지인과의 만남에서',
        context_russian: 'При встрече со знакомым'
      }
    ],
    spelling_check: {
      original_word: '안녕하세요',
      corrected_word: '안녕하세요',
      has_spelling_error: false
    },
    created_at: '2025-01-07T12:00:00Z'
  }

  describe('기본 어휘 카드 렌더링', () => {
    it('어휘 정보가 올바르게 표시된다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      expect(screen.getByText('안녕하세요')).toBeInTheDocument()
      expect(screen.getByText('Здравствуйте')).toBeInTheDocument()
      expect(screen.getByText('[здравствуйте]')).toBeInTheDocument()
      expect(screen.getByTestId('vocabulary-card')).toBeInTheDocument()
    })

    it('컴팩트 모드에서 올바르게 렌더링된다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} compact />)
      
      expect(screen.getByText('안녕하세요')).toBeInTheDocument()
      expect(screen.getByText('Здравствуйте')).toBeInTheDocument()
      expect(screen.getByTestId('vocabulary-card-compact')).toBeInTheDocument()
    })

    it('예문 개수가 올바르게 표시된다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      expect(screen.getByText(/예문 2개/)).toBeInTheDocument()
    })
  })

  describe('TTS 음성 재생 기능', () => {
    it('메인 단어 TTS 버튼이 동작한다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      const ttsButton = screen.getByTitle('발음 듣기')
      fireEvent.click(ttsButton)
      
      expect(global.speechSynthesis.cancel).toHaveBeenCalled()
      expect(global.speechSynthesis.speak).toHaveBeenCalled()
    })

    it('예문 TTS 버튼이 동작한다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      // 예문 섹션 확장
      const expandButton = screen.getByText(/예문 2개 보기/)
      fireEvent.click(expandButton)
      
      const exampleTtsButton = screen.getAllByTitle('예문 발음 듣기')[0]
      fireEvent.click(exampleTtsButton)
      
      expect(global.speechSynthesis.speak).toHaveBeenCalled()
    })

    it('TTS 재생 중 오류가 발생해도 크래시되지 않는다', () => {
      const mockError = vi.fn()
      console.error = mockError
      
      global.speechSynthesis.speak.mockImplementation(() => {
        throw new Error('TTS Error')
      })

      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      const ttsButton = screen.getByTitle('발음 듣기')
      fireEvent.click(ttsButton)
      
      expect(mockError).toHaveBeenCalledWith('TTS 재생 실패:', expect.any(Error))
    })
  })

  describe('북마크 기능', () => {
    it('북마크 토글 버튼이 동작한다', async () => {
      const mockCreateBookmark = vi.fn()
      const mockRemoveBookmark = vi.fn()
      const mockIsBookmarked = vi.fn().mockReturnValue(false)
      
      const { useBookmarkStore } = await import('../store/bookmarkStore')
      vi.mocked(useBookmarkStore).mockReturnValue({
        ...mockStores.bookmark,
        createBookmark: mockCreateBookmark,
        removeBookmark: mockRemoveBookmark,
        isBookmarked: mockIsBookmarked
      })

      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      const bookmarkButton = screen.getByTitle('북마크 추가')
      fireEvent.click(bookmarkButton)
      
      await waitFor(() => {
        expect(mockCreateBookmark).toHaveBeenCalledWith({
          session_id: 'current',
          message_id: 'vocab-1'
        })
      })
    })

    it('북마크된 상태에서 제거 동작한다', async () => {
      const mockCreateBookmark = vi.fn()
      const mockRemoveBookmark = vi.fn()
      const mockIsBookmarked = vi.fn().mockReturnValue(true)
      
      const { useBookmarkStore } = await import('../store/bookmarkStore')
      vi.mocked(useBookmarkStore).mockReturnValue({
        ...mockStores.bookmark,
        createBookmark: mockCreateBookmark,
        removeBookmark: mockRemoveBookmark,
        isBookmarked: mockIsBookmarked
      })

      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      const bookmarkButton = screen.getByTitle('북마크됨')
      expect(screen.getByText('🦊')).toBeInTheDocument()
      
      fireEvent.click(bookmarkButton)
      
      await waitFor(() => {
        expect(mockRemoveBookmark).toHaveBeenCalledWith('vocab-1')
      })
    })
  })

  describe('예문 표시 기능', () => {
    it('예문 토글 버튼이 동작한다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      // 초기 상태: 예문 숨김
      const showButton = screen.getByText('예문 2개 보기')
      
      // 예문 보기
      fireEvent.click(showButton)
      expect(screen.getByText('예문 2개 숨기기')).toBeInTheDocument()
      expect(screen.getByText('안녕하세요, 만나서 반가워요.')).toBeInTheDocument()
      
      // 예문 숨기기
      fireEvent.click(screen.getByText('예문 2개 숨기기'))
      expect(screen.getByText('예문 2개 보기')).toBeInTheDocument()
    })

    it('모든 예문이 올바르게 표시된다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      // 예문 보기
      fireEvent.click(screen.getByText('예문 2개 보기'))
      
      // 첫 번째 예문
      expect(screen.getByText('안녕하세요, 만나서 반가워요.')).toBeInTheDocument()
      expect(screen.getByText('Здравствуйте, рад познакомиться.')).toBeInTheDocument()
      expect(screen.getByText('처음 만나는 사람에게')).toBeInTheDocument()
      
      // 두 번째 예문
      expect(screen.getByText('안녕하세요, 어떻게 지내세요?')).toBeInTheDocument()
      expect(screen.getByText('Здравствуйте, как дела?')).toBeInTheDocument()
      expect(screen.getByText('지인과의 만남에서')).toBeInTheDocument()
    })
  })

  describe('맞춤법 교정 표시', () => {
    it('맞춤법 오류가 있을 때 교정 정보를 표시한다', () => {
      const vocabWithSpellingError: VocabularyEntry = {
        ...mockVocabulary,
        spelling_check: {
          original_word: '안넝하세요',
          corrected_word: '안녕하세요',
          has_spelling_error: true,
          correction_note: '올바른 철자는 "안녕하세요"입니다.'
        }
      }

      render(<VocabularyCard vocabulary={vocabWithSpellingError} />)
      
      expect(screen.getByText(/맞춤법 교정/)).toBeInTheDocument()
      expect(screen.getByText(/안넝하세요 → 안녕하세요/)).toBeInTheDocument()
      expect(screen.getByText(/올바른 철자는 "안녕하세요"입니다/)).toBeInTheDocument()
    })

    it('맞춤법 오류가 없을 때는 교정 정보를 표시하지 않는다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      expect(screen.queryByText('맞춤법 교정')).not.toBeInTheDocument()
    })
  })

  describe('접근성 및 UX', () => {
    it('키보드로 모든 버튼에 접근할 수 있다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      const ttsButton = screen.getByTitle('발음 듣기')
      const bookmarkButton = screen.getByTitle('북마크 추가')
      const exampleButton = screen.getByText('예문 2개 보기')
      
      expect(ttsButton).toHaveAttribute('tabIndex', '0')
      expect(bookmarkButton).toHaveAttribute('tabIndex', '0')
      expect(exampleButton).toHaveAttribute('tabIndex', '0')
    })

    it('적절한 ARIA 라벨이 설정되어 있다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} />)
      
      expect(screen.getByLabelText('한국어 단어 발음 재생')).toBeInTheDocument()
      expect(screen.getByLabelText('어휘 북마크 토글')).toBeInTheDocument()
      expect(screen.getByLabelText('사용 예문 토글')).toBeInTheDocument()
    })

    it('로딩 상태를 표시한다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} loading />)
      
      expect(screen.getByTestId('vocabulary-card-loading')).toBeInTheDocument()
      expect(screen.getByText('로딩 중...')).toBeInTheDocument()
    })
  })

  describe('고급 기능', () => {
    it('클릭 콜백이 올바르게 호출된다', () => {
      const onClickMock = vi.fn()
      render(<VocabularyCard vocabulary={mockVocabulary} onClick={onClickMock} />)
      
      const card = screen.getByTestId('vocabulary-card')
      fireEvent.click(card)
      
      expect(onClickMock).toHaveBeenCalledWith(mockVocabulary)
    })

    it('선택된 상태를 표시한다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} selected />)
      
      const card = screen.getByTestId('vocabulary-card')
      expect(card).toHaveClass('ring-2', 'ring-blue-500')
    })

    it('비활성화 상태를 처리한다', () => {
      render(<VocabularyCard vocabulary={mockVocabulary} disabled />)
      
      const ttsButton = screen.getByTitle('발음 듣기')
      const bookmarkButton = screen.getByTitle('북마크 추가')
      
      expect(ttsButton).toBeDisabled()
      expect(bookmarkButton).toBeDisabled()
    })
  })
})