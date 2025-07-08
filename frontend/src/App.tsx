import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AssistantChatInterface } from './components/AssistantChatInterface';
import { useThemeStore } from './store/themeStore';
import './App.css';

function App() {
  const { setTheme } = useThemeStore();

  // 초기 테마 설정
  useEffect(() => {
    // 시스템 테마 감지
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const savedTheme = localStorage.getItem('theme');
    
    // 타입 안전한 테마 검증
    const validThemes = ['light', 'dark', 'cream', 'mint', 'navy'] as const;
    type Theme = typeof validThemes[number];
    
    const isValidTheme = (theme: string | null): theme is Theme => {
      return theme !== null && validThemes.includes(theme as Theme);
    };
    
    const initialTheme = isValidTheme(savedTheme) ? savedTheme : systemTheme;
    
    setTheme(initialTheme);
  }, [setTheme]);

  // TTS 음성 로드
  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      
      speechSynthesis.addEventListener('voiceschanged', () => {
        const voices = speechSynthesis.getVoices();
        console.log('사용 가능한 TTS 음성:', voices.filter(v => v.lang.includes('ko')).length + '개');
      });
    }
  }, []);

  return (
    <div className="App min-h-screen bg-gray-50 dark:bg-gray-900">
      <AssistantChatInterface />
      
      {/* Toast 알림 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
          },
        }}
      />
    </div>
  );
}

export default App;