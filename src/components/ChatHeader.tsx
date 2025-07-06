import React from 'react';
import { Menu, Settings } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useThemeStore } from '../store/themeStore';

export const ChatHeader: React.FC = () => {
  const { currentSessionId, setSidebarOpen, isSidebarOpen } = useChatStore();
  const { openSettings } = useThemeStore();

  const handleMenuToggle = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <header className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-3">
        <button
          onClick={handleMenuToggle}
          className="p-2 rounded-lg hover:bg-white/20 transition-colors lg:hidden"
        >
          <Menu size={24} />
        </button>
        
        <div>
          <h1 className="font-bold text-lg">Korean Chat</h1>
          <p className="text-sm text-pink-100">
            {currentSessionId 
              ? `세션: ${currentSessionId.split('-').slice(-1)[0]}`
              : '한국어 학습을 시작해보세요!'
            }
          </p>
        </div>
      </div>
      
      <button
        onClick={openSettings}
        className="p-2 rounded-lg hover:bg-white/20 transition-colors"
      >
        <Settings size={24} />
      </button>
    </header>
  );
};