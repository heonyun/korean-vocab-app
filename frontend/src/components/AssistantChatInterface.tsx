import React, { useMemo } from 'react'
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from '@assistant-ui/react'
import { useChatStore } from '../store/chatStore'
import { ChatHeader } from './ChatHeader'
import { Sidebar } from './Sidebar'
import { MemoryIntegration } from './MemoryIntegration'
import { LearningRecommendations } from './LearningRecommendations'
import { AssistantThread } from './AssistantThread'
import { AssistantComposer } from './AssistantComposer'

// Assistant UI 기반 새로운 ChatInterface
export const AssistantChatInterface: React.FC = () => {
  const {
    isSidebarOpen,
    sendMessage
  } = useChatStore()

  const currentUserId = 'user-001'; // TODO: 실제 사용자 ID 로직

  // Assistant UI용 채팅 어댑터 생성
  const adapter: ChatModelAdapter = useMemo(() => ({
    async run({ messages }) {
      try {
        // 마지막 사용자 메시지 추출
        const lastMessage = messages[messages.length - 1]
        if (lastMessage?.role === 'user' && lastMessage.content) {
          const content = Array.isArray(lastMessage.content) 
            ? lastMessage.content.find(c => c.type === 'text')?.text || ''
            : lastMessage.content
          
          // 기존 sendMessage 함수 호출
          await sendMessage(content)
        }
      } catch (error) {
        console.error('Assistant UI adapter error:', error)
      }
      
      return {
        content: [{ type: "text", text: "처리 중..." }],
        status: { type: "complete", reason: "stop" },
      }
    }
  }), [sendMessage])

  // Local runtime 설정
  const runtime = useLocalRuntime(adapter)

  return (
    <MemoryIntegration userId={currentUserId}>
      <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
        {/* 사이드바 */}
        <Sidebar />
        
        {/* 메인 채팅 영역 */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-80' : ''
        }`}>
          {/* 헤더 */}
          <ChatHeader />
          
          {/* 콘텐츠 영역 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 채팅 컨테이너 */}
            <div className="flex-1 flex flex-col">
              <AssistantRuntimeProvider runtime={runtime}>
                {/* 메시지 스레드 */}
                <div className="flex-1 overflow-hidden">
                  <AssistantThread />
                </div>
                
                {/* 메시지 입력 */}
                <AssistantComposer />
              </AssistantRuntimeProvider>
            </div>
            
            {/* 학습 추천 사이드 패널 */}
            <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
              <div className="p-4">
                <LearningRecommendations />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MemoryIntegration>
  )
}