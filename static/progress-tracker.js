// 학습 진도 추적 시스템
class ProgressTracker {
    constructor() {
        this.progress = this.loadProgress();
        this.initializeUI();
    }

    // 진도 데이터 로드
    loadProgress() {
        const saved = localStorage.getItem('korean_vocab_progress');
        const defaultProgress = {
            totalWords: 0,
            learnedWords: new Set(),
            dailyStats: {},
            streak: 0,
            lastStudyDate: null,
            weeklyGoal: 10,
            achievements: []
        };
        
        if (saved) {
            const parsed = JSON.parse(saved);
            // Set 객체 복원
            parsed.learnedWords = new Set(parsed.learnedWords || []);
            return { ...defaultProgress, ...parsed };
        }
        
        return defaultProgress;
    }

    // 진도 데이터 저장
    saveProgress() {
        const toSave = {
            ...this.progress,
            learnedWords: Array.from(this.progress.learnedWords)
        };
        localStorage.setItem('korean_vocab_progress', JSON.stringify(toSave));
    }

    // 단어 학습 기록
    recordWordLearned(word) {
        const today = new Date().toISOString().split('T')[0];
        
        // 새로운 단어인지 확인
        const isNewWord = !this.progress.learnedWords.has(word);
        
        if (isNewWord) {
            this.progress.learnedWords.add(word);
            this.progress.totalWords++;
            
            // 일일 통계 업데이트
            if (!this.progress.dailyStats[today]) {
                this.progress.dailyStats[today] = { words: 0, time: 0 };
            }
            this.progress.dailyStats[today].words++;
            
            // 스트릭 업데이트
            this.updateStreak(today);
            
            // 성취 확인
            this.checkAchievements();
            
            this.saveProgress();
            
            return true;
        }
        
        return false;
    }

    // 스트릭 업데이트
    updateStreak(today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (this.progress.lastStudyDate === yesterdayStr) {
            // 연속 학습
            this.progress.streak++;
        } else if (this.progress.lastStudyDate !== today) {
            // 연속이 끊어짐
            this.progress.streak = 1;
        }
        
        this.progress.lastStudyDate = today;
    }

    // 성취 확인
    checkAchievements() {
        const achievements = [
            { id: 'first_word', name: '첫 단어', description: '첫 번째 단어 학습', condition: () => this.progress.totalWords >= 1 },
            { id: 'ten_words', name: '단어 수집가', description: '10개 단어 학습', condition: () => this.progress.totalWords >= 10 },
            { id: 'fifty_words', name: '단어 마스터', description: '50개 단어 학습', condition: () => this.progress.totalWords >= 50 },
            { id: 'hundred_words', name: '단어 박사', description: '100개 단어 학습', condition: () => this.progress.totalWords >= 100 },
            { id: 'week_streak', name: '꾸준함', description: '7일 연속 학습', condition: () => this.progress.streak >= 7 },
            { id: 'month_streak', name: '인내심', description: '30일 연속 학습', condition: () => this.progress.streak >= 30 }
        ];

        achievements.forEach(achievement => {
            if (!this.progress.achievements.includes(achievement.id) && achievement.condition()) {
                this.progress.achievements.push(achievement.id);
                this.showAchievement(achievement);
            }
        });
    }

    // 성취 알림 표시
    showAchievement(achievement) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            border-radius: 16px;
            text-align: center;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            animation: achievementPop 0.5s ease;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 12px;">🏆</div>
            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 8px;">성취 달성!</div>
            <div style="font-size: 1rem; margin-bottom: 4px;">${achievement.name}</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">${achievement.description}</div>
        `;
        
        // 애니메이션 CSS 추가
        if (!document.getElementById('achievement-styles')) {
            const style = document.createElement('style');
            style.id = 'achievement-styles';
            style.textContent = `
                @keyframes achievementPop {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'achievementPop 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }

    // 진도 통계 가져오기
    getStats() {
        const today = new Date().toISOString().split('T')[0];
        const thisWeek = this.getThisWeekStats();
        const thisMonth = this.getThisMonthStats();
        
        return {
            totalWords: this.progress.totalWords,
            streak: this.progress.streak,
            todayWords: this.progress.dailyStats[today]?.words || 0,
            weekWords: thisWeek.words,
            monthWords: thisMonth.words,
            weeklyGoal: this.progress.weeklyGoal,
            achievements: this.progress.achievements.length
        };
    }

    // 이번 주 통계
    getThisWeekStats() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        let words = 0;
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            words += this.progress.dailyStats[dateStr]?.words || 0;
        }
        
        return { words };
    }

    // 이번 달 통계
    getThisMonthStats() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        
        let words = 0;
        Object.keys(this.progress.dailyStats).forEach(date => {
            const dateObj = new Date(date);
            if (dateObj.getFullYear() === year && dateObj.getMonth() === month) {
                words += this.progress.dailyStats[date].words || 0;
            }
        });
        
        return { words };
    }

    // UI 초기화
    initializeUI() {
        // 진도 표시 스타일 추가
        if (!document.getElementById('progress-styles')) {
            const style = document.createElement('style');
            style.id = 'progress-styles';
            style.textContent = `
                .progress-widget {
                    background: var(--bg-card);
                    border-radius: 12px;
                    padding: 16px;
                    margin: 16px 0;
                    box-shadow: var(--shadow-light);
                    border: 1px solid var(--border-light);
                }
                
                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .progress-title {
                    font-weight: bold;
                    color: var(--text-primary);
                    font-size: 1.1rem;
                }
                
                .progress-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 12px;
                }
                
                .stat-item {
                    text-align: center;
                    padding: 8px;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                }
                
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: var(--btn-primary);
                }
                
                .stat-label {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-top: 4px;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: var(--bg-secondary);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-top: 8px;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--btn-primary), var(--btn-secondary));
                    transition: width 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 진도 위젯 생성
    createProgressWidget() {
        const stats = this.getStats();
        const weekProgress = Math.min((stats.weekWords / stats.weeklyGoal) * 100, 100);
        
        const widget = document.createElement('div');
        widget.className = 'progress-widget';
        widget.innerHTML = `
            <div class="progress-header">
                <div class="progress-title">📊 학습 진도</div>
                <button onclick="progressTracker.showDetailedStats()" style="background: none; border: none; color: var(--text-muted); cursor: pointer;">📈</button>
            </div>
            <div class="progress-stats">
                <div class="stat-item">
                    <div class="stat-value">${stats.totalWords}</div>
                    <div class="stat-label">총 학습 단어</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.streak}</div>
                    <div class="stat-label">연속 학습일</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.todayWords}</div>
                    <div class="stat-label">오늘 학습</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.weekWords}</div>
                    <div class="stat-label">이번 주</div>
                </div>
            </div>
            <div style="margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-muted);">
                    <span>주간 목표</span>
                    <span>${stats.weekWords}/${stats.weeklyGoal}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${weekProgress}%"></div>
                </div>
            </div>
        `;
        
        return widget;
    }

    // 상세 통계 모달 표시
    showDetailedStats() {
        const stats = this.getStats();
        const modal = document.createElement('div');
        modal.className = 'favorites-modal'; // 기존 모달 스타일 재사용
        
        const content = document.createElement('div');
        content.className = 'favorites-content';
        content.style.maxWidth = '500px';
        
        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: var(--text-primary);">📊 상세 통계</h2>
                <button onclick="this.closest('.favorites-modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">×</button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;">
                <div class="stat-item">
                    <div class="stat-value">${stats.totalWords}</div>
                    <div class="stat-label">총 학습 단어</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.streak}</div>
                    <div class="stat-label">연속 학습일</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.weekWords}</div>
                    <div class="stat-label">이번 주 학습</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.monthWords}</div>
                    <div class="stat-label">이번 달 학습</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: var(--text-primary); margin-bottom: 12px;">🏆 성취 (${stats.achievements}개)</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${this.getAchievementBadges()}
                </div>
            </div>
            
            <div>
                <h3 style="color: var(--text-primary); margin-bottom: 12px;">📅 최근 7일 학습</h3>
                <div style="display: flex; gap: 4px; justify-content: space-between;">
                    ${this.getWeeklyChart()}
                </div>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // 성취 배지 HTML 생성
    getAchievementBadges() {
        const allAchievements = [
            { id: 'first_word', name: '첫 단어', emoji: '🌱' },
            { id: 'ten_words', name: '수집가', emoji: '📚' },
            { id: 'fifty_words', name: '마스터', emoji: '🎓' },
            { id: 'hundred_words', name: '박사', emoji: '👨‍🎓' },
            { id: 'week_streak', name: '꾸준함', emoji: '🔥' },
            { id: 'month_streak', name: '인내심', emoji: '💎' }
        ];
        
        return allAchievements.map(achievement => {
            const earned = this.progress.achievements.includes(achievement.id);
            return `
                <div style="
                    padding: 8px 12px;
                    border-radius: 20px;
                    background: ${earned ? 'var(--btn-primary)' : 'var(--bg-secondary)'};
                    color: ${earned ? 'var(--text-on-primary)' : 'var(--text-muted)'};
                    font-size: 0.8rem;
                    opacity: ${earned ? '1' : '0.5'};
                ">
                    ${achievement.emoji} ${achievement.name}
                </div>
            `;
        }).join('');
    }

    // 주간 차트 HTML 생성
    getWeeklyChart() {
        const today = new Date();
        const days = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const words = this.progress.dailyStats[dateStr]?.words || 0;
            const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
            
            days.push(`
                <div style="text-align: center; flex: 1;">
                    <div style="
                        height: ${Math.max(words * 10, 4)}px;
                        background: var(--btn-primary);
                        margin-bottom: 4px;
                        border-radius: 2px;
                        transition: all 0.3s ease;
                    "></div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${dayName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${words}</div>
                </div>
            `);
        }
        
        return days.join('');
    }
}

// 전역 인스턴스 생성
const progressTracker = new ProgressTracker();

