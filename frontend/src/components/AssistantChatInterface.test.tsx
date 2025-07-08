import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/utils'
import { mockStores } from '../test/utils'
import { AssistantChatInterface } from './AssistantChatInterface'

// Mock Zustand 스토어
vi.mock('../store/chatStore')

// Mock other components to isolate testing
vi.mock('./ChatHeader', () => ({
  ChatHeader: () => <div data-testid="chat-header">Header</div>
}))

vi.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>
}))

vi.mock('./MemoryIntegration', () => ({
  MemoryIntegration: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="memory-integration">{children}</div>
  )
}))

vi.mock('./LearningRecommendations', () => ({
  LearningRecommendations: () => <div data-testid="learning-recommendations">Learning Recommendations</div>
}))

vi.mock('./AssistantThread', () => ({
  AssistantThread: () => <div data-testid="assistant-thread">Assistant Thread</div>
}))

vi.mock('./AssistantComposer', () => ({
  AssistantComposer: () => <div data-testid="assistant-composer">Assistant Composer</div>
}))

// Mock Assistant UI
vi.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="assistant-runtime-provider">{children}</div>
  ),
  useLocalRuntime: vi.fn(() => ({})),
  ThreadPrimitive: {
    Root: vi.fn(),
    Viewport: vi.fn(),
    Messages: vi.fn(),
    ScrollToBottom: vi.fn(),
    Empty: vi.fn()
  },
  ComposerPrimitive: {
    Root: vi.fn(),
    Input: vi.fn(),
    Send: vi.fn()
  }
}))

describe('AssistantChatInterface', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useChatStore } = await import('../store/chatStore')
    vi.mocked(useChatStore).mockReturnValue(mockStores.chat)
  })

  describe('초기 상태 렌더링', () => {
    it('주요 컴포넌트들이 렌더링된다', () => {
      render(<AssistantChatInterface />)
      
      expect(screen.getByTestId('memory-integration')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('chat-header')).toBeInTheDocument()
      expect(screen.getByTestId('learning-recommendations')).toBeInTheDocument()
    })

    it('Assistant UI 컴포넌트들이 렌더링된다', () => {
      render(<AssistantChatInterface />)
      
      expect(screen.getByTestId('assistant-runtime-provider')).toBeInTheDocument()
      expect(screen.getByTestId('assistant-thread')).toBeInTheDocument()
      expect(screen.getByTestId('assistant-composer')).toBeInTheDocument()
    })

    it('사이드바 상태에 따라 레이아웃이 변경된다', async () => {
      const { useChatStore } = await import('../store/chatStore')
      vi.mocked(useChatStore).mockReturnValue({
        ...mockStores.chat,
        isSidebarOpen: true
      })

      render(<AssistantChatInterface />)
      
      const mainArea = screen.getByTestId('chat-header').parentElement
      expect(mainArea).toHaveClass('lg:ml-80')
    })
  })

  describe('레이아웃 구조', () => {
    it('플렉스 레이아웃으로 채팅 컨테이너가 구성된다', () => {
      render(<AssistantChatInterface />)
      
      // AssistantThread가 포함된 div가 올바른 레이아웃을 가지는지 확인
      const chatContainer = screen.getByTestId('assistant-thread').parentElement
      expect(chatContainer).toHaveClass('flex-1', 'overflow-hidden')
    })

    it('학습 추천 사이드 패널이 올바른 스타일로 렌더링된다', () => {
      render(<AssistantChatInterface />)
      
      // learning-recommendations의 부모의 부모 요소가 사이드 패널
      const learningRecommendations = screen.getByTestId('learning-recommendations')
      const sidePanel = learningRecommendations.parentElement?.parentElement
      expect(sidePanel).toHaveClass('w-80', 'border-l', 'border-gray-200', 'dark:border-gray-700')
    })

    it('사이드바가 닫혔을 때 레이아웃이 변경된다', async () => {
      const { useChatStore } = await import('../store/chatStore')
      vi.mocked(useChatStore).mockReturnValue({
        ...mockStores.chat,
        isSidebarOpen: false
      })

      render(<AssistantChatInterface />)
      
      const mainArea = screen.getByTestId('chat-header').parentElement
      expect(mainArea).not.toHaveClass('lg:ml-80')
    })
  })

  describe('Assistant UI 통합', () => {
    it('AssistantRuntimeProvider가 Thread와 Composer를 감싸고 있다', () => {
      render(<AssistantChatInterface />)
      
      const runtimeProvider = screen.getByTestId('assistant-runtime-provider')
      const thread = screen.getByTestId('assistant-thread')
      const composer = screen.getByTestId('assistant-composer')
      
      expect(runtimeProvider).toContainElement(thread)
      expect(runtimeProvider).toContainElement(composer)
    })

    it('메모리 통합 컴포넌트가 전체를 감싸고 있다', () => {
      render(<AssistantChatInterface />)
      
      const memoryIntegration = screen.getByTestId('memory-integration')
      const sidebar = screen.getByTestId('sidebar')
      const chatHeader = screen.getByTestId('chat-header')
      
      expect(memoryIntegration).toContainElement(sidebar)
      expect(memoryIntegration).toContainElement(chatHeader)
    })
  })
})