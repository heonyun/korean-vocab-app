import React from 'react'
import { useChatStore } from '../store/chatStore'
import { AssistantMessage } from './AssistantMessage'

export const AssistantThread: React.FC = () => {
  const { messages } = useChatStore()

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Welcome message - only show when no messages */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 max-w-md mx-auto">
              <div className="text-3xl mb-4">👋</div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                안녕하세요!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                한국어 ↔ 러시아어 번역을 도와드릴게요!
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                💡 팁: /로 상황을 설명할 수 있어요!
              </p>
              <p className="text-purple-600 dark:text-purple-400 text-xs italic mt-2">
                For Emma, my eternal Muse
              </p>
            </div>
          </div>
        )}

        {/* Messages using AssistantMessage component */}
        <div className="space-y-4">
          {messages.map((message) => (
            <AssistantMessage key={message.id || Date.now()} message={message} />
          ))}
        </div>
      </div>
    </div>
  )
}