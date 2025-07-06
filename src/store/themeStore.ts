import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'cream' | 'mint' | 'navy';

interface ThemeState {
  theme: Theme;
  isSettingsOpen: boolean;
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Initial state
  theme: (localStorage.getItem('theme') as Theme) || 'light',
  isSettingsOpen: false,

  // Actions
  setTheme: (theme: Theme) => {
    // 다크모드 클래스 설정
    const darkThemes = ['dark', 'mint', 'navy'];
    if (darkThemes.includes(theme)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // 테마 속성 설정
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    set({ theme });
  },

  toggleTheme: () => {
    const { theme, setTheme } = get();
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  },

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
}));