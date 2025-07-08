import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { Toaster } from 'react-hot-toast'
import { vi } from 'vitest'

// Mock 상태 저장소들
export const mockStores = {
  chat: {
    messages: [],
    isLoading: false,
    isTyping: false,
    isSidebarOpen: false,
    sendMessage: vi.fn(),
    setCurrentSession: vi.fn(),
    addMessage: vi.fn(),
    setIsLoading: vi.fn(),
    setIsTyping: vi.fn(),
    setSidebarOpen: vi.fn(),
  },
  bookmark: {
    bookmarks: [],
    createBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    isBookmarked: vi.fn(() => false),
  },
  theme: {
    theme: 'light',
    setTheme: vi.fn(),
  }
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
      <Toaster position="top-right" />
    </div>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }