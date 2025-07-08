import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssistantComposer } from './AssistantComposer'
import { useChatStore } from '../store/chatStore'

// Mock the chat store
vi.mock('../store/chatStore')
const mockUseChatStore = vi.mocked(useChatStore)

// No need to mock Assistant UI components for simplified version

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Send: vi.fn(() => <span data-testid="send-icon">Send</span>)
}))

describe('AssistantComposer', () => {
  const mockSendMessage = vi.fn()

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
      sendMessage: mockSendMessage,
      loadSession: vi.fn(),
      loadSessions: vi.fn(),
      createNewSession: vi.fn(),
      deleteSession: vi.fn()
    })
  })

  it('renders composer container with proper styling', () => {
    render(<AssistantComposer />)
    
    const composer = screen.getByPlaceholderText('궁금한 표현을 입력하세요...').closest('.flex.items-center.gap-2')
    expect(composer).toBeInTheDocument()
    expect(composer).toHaveClass('flex', 'items-center', 'gap-2', 'p-4', 'bg-white', 'dark:bg-gray-800', 'border-t', 'border-gray-200', 'dark:border-gray-700')
  })

  it('renders input with correct props', () => {
    render(<AssistantComposer />)
    
    const input = screen.getByPlaceholderText('궁금한 표현을 입력하세요...')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('flex-1', 'px-4', 'py-2', 'border', 'border-gray-300', 'dark:border-gray-600', 'rounded-lg', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-gray-100')
  })

  it('renders send button with Send icon', () => {
    render(<AssistantComposer />)
    
    const sendButton = screen.getByRole('button')
    expect(sendButton).toBeInTheDocument()
    expect(sendButton).toHaveClass('px-4', 'py-2', 'bg-blue-500', 'text-white', 'rounded-lg', 'hover:bg-blue-600', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'transition-colors')
    expect(screen.getByTestId('send-icon')).toBeInTheDocument()
  })

  describe('Loading state', () => {
    it('disables input and button when loading', () => {
      mockUseChatStore.mockReturnValue({
        messages: [],
        isLoading: true,
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
        sendMessage: mockSendMessage,
        loadSession: vi.fn(),
        loadSessions: vi.fn(),
        createNewSession: vi.fn(),
        deleteSession: vi.fn()
      })

      render(<AssistantComposer />)
      
      expect(screen.getByPlaceholderText('궁금한 표현을 입력하세요...')).toBeDisabled()
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('enables input and button when not loading', () => {
      render(<AssistantComposer />)
      
      expect(screen.getByPlaceholderText('궁금한 표현을 입력하세요...')).not.toBeDisabled()
      // Button is disabled when input is empty by default
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Typing indicator', () => {
    it('shows typing indicator when AI is typing', () => {
      mockUseChatStore.mockReturnValue({
        messages: [],
        isLoading: false,
        isTyping: true,
        isSidebarOpen: true,
        currentSession: null,
        currentSessionId: null,
        sessions: [],
        setCurrentSession: vi.fn(),
        addMessage: vi.fn(),
        setIsLoading: vi.fn(),
        setIsTyping: vi.fn(),
        setSidebarOpen: vi.fn(),
        sendMessage: mockSendMessage,
        loadSession: vi.fn(),
        loadSessions: vi.fn(),
        createNewSession: vi.fn(),
        deleteSession: vi.fn()
      })

      render(<AssistantComposer />)
      
      expect(screen.getByText('AI가 응답을 준비 중입니다...')).toBeInTheDocument()
    })

    it('hides typing indicator when AI is not typing', () => {
      render(<AssistantComposer />)
      
      expect(screen.queryByText('AI가 응답을 준비 중입니다...')).not.toBeInTheDocument()
    })
  })

  describe('User interactions', () => {
    it('calls sendMessage when Enter key is pressed with text', async () => {
      const user = userEvent.setup()
      render(<AssistantComposer />)
      
      const input = screen.getByPlaceholderText('궁금한 표현을 입력하세요...')
      
      await user.type(input, 'Hello{enter}')
      
      expect(mockSendMessage).toHaveBeenCalledWith('Hello')
    })

    it('does not call sendMessage when Enter key is pressed with empty text', async () => {
      const user = userEvent.setup()
      render(<AssistantComposer />)
      
      const input = screen.getByPlaceholderText('궁금한 표현을 입력하세요...')
      
      await user.type(input, '{enter}')
      
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('does not call sendMessage when Enter key is pressed while loading', async () => {
      mockUseChatStore.mockReturnValue({
        messages: [],
        isLoading: true,
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
        sendMessage: mockSendMessage,
        loadSession: vi.fn(),
        loadSessions: vi.fn(),
        createNewSession: vi.fn(),
        deleteSession: vi.fn()
      })

      const user = userEvent.setup()
      render(<AssistantComposer />)
      
      const input = screen.getByPlaceholderText('궁금한 표현을 입력하세요...')
      
      await user.type(input, 'Hello{enter}')
      
      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })
})