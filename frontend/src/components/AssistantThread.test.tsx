import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssistantThread } from './AssistantThread'
import { useChatStore } from '../store/chatStore'

// Mock the chat store
vi.mock('../store/chatStore')
const mockUseChatStore = vi.mocked(useChatStore)

// No need to mock Assistant UI components for simplified version

describe('AssistantThread', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChatStore.mockReturnValue({
      messages: [],
      isLoading: false,
      isTyping: false,
      isSidebarOpen: true,
      currentSession: null,
      currentSessionId: null,
      sessions: [],
      setCurrentSession: vi.fn(),
      addMessage: vi.fn(),
      setIsLoading: vi.fn(),
      setIsTyping: vi.fn(),
      setSidebarOpen: vi.fn(),
      sendMessage: vi.fn(),
      loadSession: vi.fn(),
      loadSessions: vi.fn(),
      createNewSession: vi.fn(),
      deleteSession: vi.fn()
    })
  })

  it('renders the thread container with proper styling', () => {
    render(<AssistantThread />)
    
    const container = screen.getByText('안녕하세요!').closest('.flex.flex-col.h-full')
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass('bg-white', 'dark:bg-gray-800')
  })

  it('renders messages container', () => {
    render(<AssistantThread />)
    
    const messagesContainer = screen.getByText('안녕하세요!').closest('.overflow-y-auto')
    expect(messagesContainer).toBeInTheDocument()
    expect(messagesContainer).toHaveClass('flex-1', 'overflow-y-auto', 'px-4', 'py-6')
  })

  describe('Welcome message', () => {
    it('shows welcome message when no messages exist', () => {
      mockUseChatStore.mockReturnValue({
        messages: [],
        isLoading: false,
        isTyping: false,
        isSidebarOpen: true,
        currentSession: null,
        currentSessionId: null,
        sessions: [],
        setCurrentSession: vi.fn(),
        addMessage: vi.fn(),
        setIsLoading: vi.fn(),
        setIsTyping: vi.fn(),
        setSidebarOpen: vi.fn(),
        sendMessage: vi.fn(),
        loadSession: vi.fn(),
        loadSessions: vi.fn(),
        createNewSession: vi.fn(),
        deleteSession: vi.fn()
      })

      render(<AssistantThread />)
      
      expect(screen.getByText('안녕하세요!')).toBeInTheDocument()
      expect(screen.getByText('한국어 ↔ 러시아어 번역을 도와드릴게요!')).toBeInTheDocument()
    })

    it('hides welcome message when messages exist', () => {
      mockUseChatStore.mockReturnValue({
        messages: [
          {
            id: '1',
            type: 'user',
            text: 'Hello',
            created_at: new Date().toISOString()
          }
        ],
        isLoading: false,
        isTyping: false,
        isSidebarOpen: true,
        currentSession: null,
        currentSessionId: null,
        sessions: [],
        setCurrentSession: vi.fn(),
        addMessage: vi.fn(),
        setIsLoading: vi.fn(),
        setIsTyping: vi.fn(),
        setSidebarOpen: vi.fn(),
        sendMessage: vi.fn(),
        loadSession: vi.fn(),
        loadSessions: vi.fn(),
        createNewSession: vi.fn(),
        deleteSession: vi.fn()
      })

      render(<AssistantThread />)
      
      expect(screen.queryByTestId('thread-empty')).not.toBeInTheDocument()
    })
  })

})