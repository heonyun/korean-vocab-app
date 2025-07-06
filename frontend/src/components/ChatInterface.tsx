import { useEffect, useRef } from 'react';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  MessageInput,
  TypingIndicator
} from '@chatscope/chat-ui-kit-react';
import { useChatStore } from '../store/chatStore';
import { MessageComponent } from './MessageComponent';
import { ChatHeader } from './ChatHeader';
import { Sidebar } from './Sidebar';

export const ChatInterface: React.FC = () => {
  const {
    messages,
    isLoading,
    isTyping,
    isSidebarOpen,
    sendMessage
  } = useChatStore();

  const messageListRef = useRef<any>(null);

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollToBottom();
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    await sendMessage(text);
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 사이드바 */}
      <Sidebar />
      
      {/* 메인 채팅 영역 */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-80' : ''
      }`}>
        {/* 헤더 */}
        <ChatHeader />
        
        {/* 채팅 컨테이너 */}
        <div className="flex-1 relative">
          <MainContainer>
            <ChatContainer>
              <MessageList
                ref={messageListRef}
                typingIndicator={
                  isTyping ? (
                    <TypingIndicator content="AI가 응답을 준비 중입니다..." />
                  ) : null
                }
                className="p-4"
              >
                {/* 환영 메시지 */}
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
                
                {/* 메시지 목록 */}
                {messages.map((message) => (
                  <MessageComponent key={message.id || Date.now()} message={message} />
                ))}
              </MessageList>
              
              {/* 메시지 입력 */}
              <MessageInput
                placeholder="궁금한 표현을 입력하세요..."
                onSend={handleSendMessage}
                disabled={isLoading}
                attachButton={false}
                sendButton={true}
                className="bg-white dark:bg-gray-800"
              />
            </ChatContainer>
          </MainContainer>
        </div>
      </div>
    </div>
  );
};