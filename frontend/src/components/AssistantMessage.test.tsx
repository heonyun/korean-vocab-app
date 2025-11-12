import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/utils'
import { mockStores } from '../test/utils'
import { AssistantMessage } from './AssistantMessage'
import type { ChatMessage } from '../types/api'

// Mock Zustand 스토어
vi.mock('../store/bookmarkStore')

// Speech API mocked in setup.ts

describe('AssistantMessage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useBookmarkStore } = await import('../store/bookmarkStore')
    vi.mocked(useBookmarkStore).mockReturnValue(mockStores.bookmark)
  })

  describe('사용자 메시지', () => {
    it('사용자 메시지가 올바르게 렌더링된다', () => {
      const userMessage: ChatMessage = {
        id: '1',
        type: 'user',
        text: '안녕하세요',
        created_at: '2025-01-07T12:00:00Z'
      }

      render(<AssistantMessage message={userMessage} />)
      
      expect(screen.getByText('안녕하세요')).toBeInTheDocument()
      // Assistant UI UserMessage 구조 확인
      expect(screen.getByTestId('user-message')).toBeInTheDocument()
    })
  })

  describe('시스템 메시지', () => {
    it('시스템 메시지가 올바르게 렌더링된다', () => {
      const systemMessage: ChatMessage = {
        id: '2',
        type: 'system',
        text: '네트워크 오류가 발생했습니다.',
        created_at: '2025-01-07T12:00:00Z'
      }

      render(<AssistantMessage message={systemMessage} />)
      
      expect(screen.getByText('네트워크 오류가 발생했습니다.')).toBeInTheDocument()
      expect(screen.getByTestId('system-message')).toBeInTheDocument()
    })
  })

  describe('AI 메시지 (어휘 데이터 포함)', () => {
    const aiMessageWithVocab: ChatMessage = {
      id: '3',
      type: 'ai',
      text: '안녕하세요 → Здравствуйте',
      created_at: '2025-01-07T12:00:00Z',
      data: {
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
        }
      }
    }

    it('어휘 정보가 올바르게 표시된다', () => {
      render(<AssistantMessage message={aiMessageWithVocab} />)
      
      expect(screen.getByText('안녕하세요')).toBeInTheDocument()
      expect(screen.getByText('Здравствуйте')).toBeInTheDocument()
      expect(screen.getByText(/здравствуйте/)).toBeInTheDocument()
      expect(screen.getByTestId('ai-message')).toBeInTheDocument()
    })

    it('사용 예문이 표시된다', () => {
      render(<AssistantMessage message={aiMessageWithVocab} />)
      
      expect(screen.getByText(/예문 2개/)).toBeInTheDocument()
      expect(screen.getByText('안녕하세요, 만나서 반가워요.')).toBeInTheDocument()
      expect(screen.getByText('Здравствуйте, рад познакомиться.')).toBeInTheDocument()
    })

    it('예문 토글 버튼이 동작한다', () => {
      render(<AssistantMessage message={aiMessageWithVocab} />)
      
      // 초기 상태: showExamples=true이므로 "숨기기" 버튼이 보임
      const toggleButton = screen.getByRole('button', { name: '📝 예문 2개 숨기기' })
      
      // 예문 숨기기 클릭
      fireEvent.click(toggleButton)
      expect(screen.getByRole('button', { name: '📝 예문 2개 보기' })).toBeInTheDocument()
      
      // 예문 다시 보기 클릭
      fireEvent.click(screen.getByRole('button', { name: '📝 예문 2개 보기' }))
      expect(screen.getByRole('button', { name: '📝 예문 2개 숨기기' })).toBeInTheDocument()
    })

    it('TTS 음성 재생 버튼이 동작한다', () => {
      render(<AssistantMessage message={aiMessageWithVocab} />)
      
      const ttsButton = screen.getAllByTitle('발음 듣기')[0]
      fireEvent.click(ttsButton)
      
      expect(global.speechSynthesis.cancel).toHaveBeenCalled()
      expect(global.speechSynthesis.speak).toHaveBeenCalled()
    })

    it('예문의 TTS 버튼이 동작한다', () => {
      render(<AssistantMessage message={aiMessageWithVocab} />)
      
      const exampleTtsButton = screen.getAllByTitle('예문 발음 듣기')[0]
      fireEvent.click(exampleTtsButton)
      
      expect(global.speechSynthesis.speak).toHaveBeenCalled()
    })

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

      render(<AssistantMessage message={aiMessageWithVocab} />)
      
      const bookmarkButton = screen.getByTitle('북마크 추가')
      fireEvent.click(bookmarkButton)
      
      await waitFor(() => {
        expect(mockCreateBookmark).toHaveBeenCalledWith({
          session_id: 'current',
          message_id: '3'
        })
      })
    })

    it('북마크가 이미 되어있을 때 제거 동작한다', async () => {
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

      render(<AssistantMessage message={aiMessageWithVocab} />)
      
      const bookmarkButton = screen.getByTitle('북마크됨')
      expect(screen.getByText('🦊')).toBeInTheDocument() // 북마크됨 상태 아이콘
      
      fireEvent.click(bookmarkButton)
      
      await waitFor(() => {
        expect(mockRemoveBookmark).toHaveBeenCalledWith('3')
      })
    })
  })

  describe('맞춤법 교정 기능', () => {
    it('맞춤법 오류가 있을 때 교정 정보를 표시한다', () => {
      const messageWithSpellingError: ChatMessage = {
        id: '4',
        type: 'ai',
        text: '안넝하세요 → Здравствуйте',
        created_at: '2025-01-07T12:00:00Z',
        data: {
          original_word: '안넝하세요',
          russian_translation: 'Здравствуйте',
          pronunciation: '[здравствуйте]',
          usage_examples: [],
          spelling_check: {
            original_word: '안넝하세요',
            corrected_word: '안녕하세요',
            has_spelling_error: true,
            correction_note: '올바른 철자는 "안녕하세요"입니다.'
          }
        }
      }

      render(<AssistantMessage message={messageWithSpellingError} />)
      
      expect(screen.getByText('맞춤법 교정:')).toBeInTheDocument()
      expect(screen.getByText('안넝하세요 → 안녕하세요')).toBeInTheDocument()
      expect(screen.getByText('올바른 철자는 "안녕하세요"입니다.')).toBeInTheDocument()
    })
  })

  describe('기본 AI 메시지 (어휘 데이터 없음)', () => {
    it('어휘 데이터가 없는 AI 메시지가 렌더링된다', () => {
      const basicAiMessage: ChatMessage = {
        id: '5',
        type: 'ai',
        text: '죄송합니다. 처리할 수 없는 요청입니다.',
        created_at: '2025-01-07T12:00:00Z'
      }

      render(<AssistantMessage message={basicAiMessage} />)
      
      expect(screen.getByText('죄송합니다. 처리할 수 없는 요청입니다.')).toBeInTheDocument()
      expect(screen.getByTestId('ai-message')).toBeInTheDocument()
    })
  })

  describe('TTS 오류 처리', () => {
    it('TTS 재생 중 오류가 발생해도 크래시되지 않는다', () => {
      const mockError = vi.fn()
      console.error = mockError
      
      global.speechSynthesis.speak.mockImplementation(() => {
        throw new Error('TTS Error')
      })

      const message: ChatMessage = {
        id: '6',
        type: 'ai',
        text: 'test',
        data: {
          original_word: 'test',
          russian_translation: 'тест',
          pronunciation: '[тест]',
          usage_examples: []
        }
      }

      render(<AssistantMessage message={message} />)
      
      const ttsButton = screen.getAllByTitle('발음 듣기')[0]
      fireEvent.click(ttsButton)
      
      expect(mockError).toHaveBeenCalledWith('TTS 재생 실패:', expect.any(Error))
    })
  })

  describe('Assistant UI 통합', () => {
    it('Assistant UI Message 컴포넌트 구조가 올바르게 렌더링된다', () => {
      const aiMessage: ChatMessage = {
        id: '7',
        type: 'ai',
        text: 'Assistant UI test message',
        created_at: '2025-01-07T12:00:00Z'
      }

      render(<AssistantMessage message={aiMessage} />)
      
      // Assistant UI 구조 확인
      expect(screen.getByTestId('ai-message')).toBeInTheDocument()
      expect(screen.getByText('Assistant UI test message')).toBeInTheDocument()
    })

    it('Assistant UI UserMessage 구조가 올바르게 렌더링된다', () => {
      const userMessage: ChatMessage = {
        id: '8',
        type: 'user',
        text: 'User test message',
        created_at: '2025-01-07T12:00:00Z'
      }

      render(<AssistantMessage message={userMessage} />)
      
      // Assistant UI 구조 확인
      expect(screen.getByTestId('user-message')).toBeInTheDocument()
      expect(screen.getByText('User test message')).toBeInTheDocument()
    })
  })
})