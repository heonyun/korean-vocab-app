import React, { useState } from 'react'
import { Send } from 'lucide-react'
import { useChatStore } from '../store/chatStore'

// Simplified AssistantComposer component for the migration
export const AssistantComposer: React.FC = () => {
  const { isLoading, isTyping, sendMessage } = useChatStore()
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const text = inputValue.trim()
    if (text && !isLoading) {
      sendMessage(text)
      setInputValue('')
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="궁금한 표현을 입력하세요..."
          disabled={isLoading}
          autoFocus
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
      
      {/* Typing indicator */}
      {isTyping && (
        <div className="px-4 pb-2 text-sm text-gray-500">
          AI가 응답을 준비 중입니다...
        </div>
      )}
    </div>
  )
}