/**
 * Korean Vocab App - Theme Management
 * 테마 관리 모듈 - 모든 페이지에서 공통으로 사용
 */

// 테마 관리 클래스
class ThemeManager {
    constructor() {
        this.themeNames = {
            'dark': '다크',
            'cream': '베이지 크림',
            'mint': '민트 그레이',
            'navy': '네이비 크림'
        };
        
        this.themeColors = {
            'light': '#F0A8D0',
            'dark': '#1a1a2e',
            'cream': '#555879',
            'mint': '#333446',
            'navy': '#213448'
        };
        
        this.initialized = false;
    }

    /**
     * 테마 설정
     * @param {string} theme - 설정할 테마 이름
     */
    setTheme(theme) {
        console.log(`🎨 테마 변경 시도: ${theme}`);
        
        // Tailwind 다크모드 클래스 설정
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // 테마 속성 설정
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        console.log(`✅ data-theme 속성 설정됨: ${document.documentElement.getAttribute('data-theme')}`);
        
        // 테마 선택 버튼들 활성 상태 업데이트
        this.updateThemeButtons(theme);
        
        // PWA 테마 색상 업데이트
        this.updateThemeColor(theme);
        
        // 커스텀 이벤트 발생 (다른 모듈에서 테마 변경 감지 가능)
        window.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { theme: theme }
        }));
        
        console.log(`🎨 테마 변경 완료: ${theme}`);
    }

    /**
     * 테마 선택 버튼들의 활성 상태 업데이트
     * @param {string} currentTheme - 현재 활성 테마
     */
    updateThemeButtons(currentTheme) {
        const themeButtons = document.querySelectorAll('.theme-option');
        themeButtons.forEach(button => {
            const buttonTheme = button.getAttribute('data-theme');
            if (buttonTheme === currentTheme) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * PWA 테마 색상 업데이트
     * @param {string} theme - 테마 이름
     */
    updateThemeColor(theme) {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.content = this.themeColors[theme] || this.themeColors.cream;
        }
    }

    /**
     * 테마 선택기 이벤트 리스너 설정 (한 번만 실행)
     */
    setupThemeSelectorListeners() {
        if (this.initialized) return; // 중복 실행 방지
        
        const themeButtons = document.querySelectorAll('.theme-option');
        if (themeButtons.length === 0) {
            console.warn('테마 선택 버튼을 찾을 수 없습니다.');
            return;
        }

        themeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const selectedTheme = button.getAttribute('data-theme');
                this.setTheme(selectedTheme);
                
                // 알림 표시 (showNotification 함수가 있으면 사용, 없으면 콘솔 로그)
                const message = `${this.themeNames[selectedTheme]} 테마로 전환되었습니다!`;
                if (typeof showNotification === 'function') {
                    showNotification(message, 'success');
                } else {
                    console.log(message);
                }
            });
        });
        
        this.initialized = true;
        console.log(`테마 선택기 이벤트 리스너 설정 완료 (${themeButtons.length}개 버튼)`);
    }

    /**
     * 테마 선택기 UI 상태 업데이트 (설정 패널 열릴 때마다 실행)
     */
    updateThemeSelectorUI() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        this.updateThemeButtons(currentTheme);
    }

    /**
     * 저장된 테마 로드 또는 시스템 테마 감지
     */
    loadInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'cream';
        const currentTheme = savedTheme || systemTheme;
        
        this.setTheme(currentTheme);
        return currentTheme;
    }

    /**
     * 테마 토글 (다크 ↔ 크림)
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'cream' : 'dark';
        this.setTheme(newTheme);
        
        // 알림 표시
        const message = `${this.themeNames[newTheme]} 테마로 전환되었습니다!`;
        if (typeof showNotification === 'function') {
            showNotification(message, 'success');
        } else {
            console.log(message);
        }
    }

    /**
     * 시스템 테마 변경 감지 리스너 설정
     */
    setupSystemThemeListener() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) { // 사용자가 수동으로 설정하지 않은 경우만
                this.setTheme(e.matches ? 'dark' : 'cream');
            }
        });
    }
}

// 전역 테마 매니저 인스턴스
window.themeManager = new ThemeManager();

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager.loadInitialTheme();
    window.themeManager.setupSystemThemeListener();
    
    // 테마 선택기가 있으면 이벤트 리스너 설정
    if (document.querySelector('.theme-option')) {
        window.themeManager.setupThemeSelectorListeners();
    }
});