// 즐겨찾기 관리 시스템 (여우 아이콘 버전)
class FavoritesManager {
    constructor() {
        this.favorites = this.loadFavorites();
        this.initializeUI();
    }

    // 로컬스토리지에서 즐겨찾기 로드
    loadFavorites() {
        const saved = localStorage.getItem('korean_vocab_favorites');
        return saved ? JSON.parse(saved) : [];
    }

    // 즐겨찾기 저장
    saveFavorites() {
        localStorage.setItem('korean_vocab_favorites', JSON.stringify(this.favorites));
    }

    // 단어 즐겨찾기 추가/제거
    toggleFavorite(word, translation, example = '') {
        const existingIndex = this.favorites.findIndex(fav => fav.word === word);
        
        if (existingIndex >= 0) {
            // 이미 즐겨찾기에 있으면 제거
            this.favorites.splice(existingIndex, 1);
            this.showNotification(`"${word}" 즐겨찾기에서 제거되었습니다.`, 'info');
            return false;
        } else {
            // 즐겨찾기에 추가
            this.favorites.push({
                word,
                translation,
                example,
                addedAt: new Date().toISOString()
            });
            this.showNotification(`"${word}" 즐겨찾기에 추가되었습니다.`, 'success');
            return true;
        }
    }

    // 단어가 즐겨찾기에 있는지 확인
    isFavorite(word) {
        return this.favorites.some(fav => fav.word === word);
    }

    // 즐겨찾기 목록 가져오기
    getFavorites() {
        return [...this.favorites].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }

    // 즐겨찾기 UI 초기화
    initializeUI() {
        // 즐겨찾기 버튼 스타일 추가
        if (!document.getElementById('favorites-styles')) {
            const style = document.createElement('style');
            style.id = 'favorites-styles';
            style.textContent = `
                .favorite-btn {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    color: var(--text-muted);
                }
                
                .favorite-btn:hover {
                    background-color: var(--bg-secondary);
                    transform: scale(1.1);
                }
                
                .favorite-btn.active {
                    color: #ff6b6b;
                }
                
                .favorites-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .favorites-content {
                    background: var(--bg-card);
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    margin: 20px;
                    box-shadow: var(--shadow-heavy);
                }
                
                .favorite-item {
                    padding: 12px;
                    border-bottom: 1px solid var(--border-light);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .favorite-item:last-child {
                    border-bottom: none;
                }
                
                .favorite-word {
                    font-weight: bold;
                    color: var(--text-primary);
                }
                
                .favorite-translation {
                    color: var(--text-secondary);
                    margin-top: 4px;
                }
                
                .favorite-example {
                    color: var(--text-muted);
                    font-size: 0.9rem;
                    margin-top: 4px;
                    font-style: italic;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 즐겨찾기 버튼 생성 (여우 아이콘 사용)
    createFavoriteButton(word, translation, example = '') {
        const button = document.createElement('button');
        button.className = `favorite-btn ${this.isFavorite(word) ? 'active' : ''}`;
        button.innerHTML = this.isFavorite(word) ? '🦊' : '🤍';
        button.title = this.isFavorite(word) ? '즐겨찾기에서 제거' : '즐겨찾기에 추가';
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const isAdded = this.toggleFavorite(word, translation, example);
            button.className = `favorite-btn ${isAdded ? 'active' : ''}`;
            button.innerHTML = isAdded ? '🦊' : '🤍';
            button.title = isAdded ? '즐겨찾기에서 제거' : '즐겨찾기에 추가';
            this.saveFavorites();
        });
        
        return button;
    }

    // 즐겨찾기 모달 표시
    showFavoritesModal() {
        const modal = document.createElement('div');
        modal.className = 'favorites-modal';
        
        const content = document.createElement('div');
        content.className = 'favorites-content';
        
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';
        header.innerHTML = `
            <h2 style="margin: 0; color: var(--text-primary);">🦊 즐겨찾기 단어</h2>
            <button id="close-favorites" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">×</button>
        `;
        
        const favoritesList = document.createElement('div');
        const favorites = this.getFavorites();
        
        if (favorites.length === 0) {
            favoritesList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <div style="font-size: 3rem; margin-bottom: 16px;">🦊</div>
                    <div>아직 즐겨찾기한 단어가 없습니다.</div>
                    <div style="font-size: 0.9rem; margin-top: 8px;">단어 옆의 여우 버튼을 눌러 즐겨찾기에 추가해보세요!</div>
                </div>
            `;
        } else {
            favoritesList.innerHTML = favorites.map(fav => `
                <div class="favorite-item">
                    <div>
                        <div class="favorite-word">${fav.word}</div>
                        <div class="favorite-translation">${fav.translation}</div>
                        ${fav.example ? `<div class="favorite-example">${fav.example}</div>` : ''}
                    </div>
                    <button class="favorite-btn active" onclick="favoritesManager.removeFavorite('${fav.word}'); this.parentElement.remove();">🦊</button>
                </div>
            `).join('');
        }
        
        content.appendChild(header);
        content.appendChild(favoritesList);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // 모달 닫기 이벤트
        document.getElementById('close-favorites').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // 즐겨찾기 제거
    removeFavorite(word) {
        const index = this.favorites.findIndex(fav => fav.word === word);
        if (index >= 0) {
            this.favorites.splice(index, 1);
            this.saveFavorites();
            this.showNotification(`"${word}" 즐겨찾기에서 제거되었습니다.`, 'info');
        }
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        // 기존 알림 함수가 있다면 사용, 없다면 간단한 알림 생성
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#4CAF50' : type === 'info' ? '#2196F3' : '#FF9800'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease;
            `;
            notification.textContent = message;
            
            // 애니메이션 CSS 추가
            if (!document.getElementById('notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }
}

// 전역 인스턴스 생성
const favoritesManager = new FavoritesManager();