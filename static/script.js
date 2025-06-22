// 전역 변수
let currentVocabularyData = null;

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // 엔터키로 어휘 생성
    const input = document.getElementById('korean-word-input');
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateVocabulary();
        }
    });
    
    // 페이지 로드시 저장된 어휘 목록 새로고침
    refreshVocabularyList();
});

// 어휘 생성 함수
async function generateVocabulary() {
    const input = document.getElementById('korean-word-input');
    const word = input.value.trim();
    
    if (!word) {
        alert('한국어 단어를 입력해주세요!');
        input.focus();
        return;
    }
    
    // UI 상태 변경
    showLoading(true);
    hideResult();
    disableGenerateButton(true);
    
    try {
        const response = await fetch('/api/generate-vocabulary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                korean_word: word
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.data) {
            currentVocabularyData = data.data;
            displayVocabularyResult(data.data);
            showResult();
        } else {
            throw new Error(data.error || '어휘 생성에 실패했습니다.');
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('오류: ' + error.message);
    } finally {
        showLoading(false);
        disableGenerateButton(false);
    }
}

// 어휘 결과 표시
function displayVocabularyResult(data) {
    document.getElementById('original-word').textContent = data.original_word;
    document.getElementById('russian-translation').textContent = data.russian_translation;
    document.getElementById('pronunciation').textContent = data.pronunciation;
    
    // 예제들 표시
    const examplesContainer = document.getElementById('examples-container');
    examplesContainer.innerHTML = '';
    
    data.usage_examples.forEach((example, index) => {
        const exampleDiv = document.createElement('div');
        exampleDiv.className = 'example-item';
        exampleDiv.innerHTML = `
            <div class="example-korean">${example.korean_sentence}</div>
            <div class="example-russian">${example.russian_translation}</div>
            <div class="example-meta">
                <div class="example-grammar">
                    <span class="grammar-korean">${example.grammar_note}</span>
                    <span class="grammar-russian">${example.grammar_note_russian || ''}</span>
                </div>
                <span class="example-context">${example.context}</span>
            </div>
        `;
        examplesContainer.appendChild(exampleDiv);
    });
}

// 발음 재생
function playPronunciation() {
    const word = document.getElementById('original-word').textContent;
    if (word && word !== '-') {
        // 브라우저 TTS 사용
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.8;  // 조금 느리게
            window.speechSynthesis.speak(utterance);
        } else {
            alert('이 브라우저는 음성 재생을 지원하지 않습니다.');
        }
    }
}

// 어휘 저장 (이미 자동으로 저장되므로 알림만)
function saveVocabulary() {
    if (currentVocabularyData) {
        alert('✅ 어휘가 노트에 저장되었습니다!');
        refreshVocabularyList();
    }
}

// 결과 지우기
function clearResult() {
    hideResult();
    document.getElementById('korean-word-input').value = '';
    document.getElementById('korean-word-input').focus();
    currentVocabularyData = null;
}

// 저장된 어휘 목록 새로고침
async function refreshVocabularyList() {
    try {
        const response = await fetch('/api/vocabulary');
        const vocabularyList = await response.json();
        
        const container = document.getElementById('vocabulary-list-container');
        
        if (vocabularyList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>아직 저장된 어휘가 없습니다.</p>
                    <p>위에서 한국어 단어를 입력해보세요!</p>
                </div>
            `;
        } else {
            container.innerHTML = '';
            vocabularyList.slice(0, 10).forEach(vocab => {  // 최신 10개만 표시
                const itemDiv = document.createElement('div');
                itemDiv.className = 'vocabulary-item';
                itemDiv.setAttribute('data-word', vocab.original_word);
                itemDiv.innerHTML = `
                    <div class="item-header">
                        <span class="korean-word">${vocab.original_word}</span>
                        <span class="russian-word">${vocab.russian_translation}</span>
                    </div>
                    <div class="item-actions">
                        <button onclick="showVocabularyDetail('${vocab.original_word}')" class="detail-btn">상세보기</button>
                        <button onclick="deleteVocabulary('${vocab.original_word}')" class="delete-btn">삭제</button>
                    </div>
                `;
                container.appendChild(itemDiv);
            });
        }
        
        // 헤더의 개수 업데이트
        const headerCount = document.querySelector('.list-header h3');
        if (headerCount) {
            headerCount.textContent = `📚 저장된 어휘 (${vocabularyList.length}개)`;
        }
        
    } catch (error) {
        console.error('Error refreshing vocabulary list:', error);
    }
}

// 어휘 상세보기
async function showVocabularyDetail(word) {
    try {
        const response = await fetch(`/api/vocabulary/${encodeURIComponent(word)}`);
        const data = await response.json();
        
        if (data) {
            showModal(createVocabularyDetailHTML(data));
        }
    } catch (error) {
        console.error('Error showing vocabulary detail:', error);
        alert('어휘 정보를 불러올 수 없습니다.');
    }
}

// 어휘 상세 HTML 생성
function createVocabularyDetailHTML(data) {
    let examplesHTML = '';
    data.usage_examples.forEach(example => {
        examplesHTML += `
            <div class="example-item">
                <div class="example-korean">${example.korean_sentence}</div>
                <div class="example-russian">${example.russian_translation}</div>
                <div class="example-meta">
                    <div class="example-grammar">
                        <span class="grammar-korean">${example.grammar_note}</span>
                        <span class="grammar-russian">${example.grammar_note_russian || ''}</span>
                    </div>
                    <span class="example-context">${example.context}</span>
                </div>
            </div>
        `;
    });
    
    return `
        <div class="vocabulary-card">
            <div class="card-header">
                <h2>${data.original_word}</h2>
                <button onclick="playModalPronunciation('${data.original_word}')" class="play-btn">🔊</button>
            </div>
            
            <div class="translation-info">
                <div class="russian-translation">
                    <strong>🇷🇺 러시아어:</strong> ${data.russian_translation}
                </div>
                <div class="pronunciation">
                    <strong>🔊 발음:</strong> ${data.pronunciation}
                </div>
            </div>

            <div class="usage-examples">
                <h3>💡 활용 예제</h3>
                ${examplesHTML}
            </div>
        </div>
    `;
}

// 모달에서 발음 재생
function playModalPronunciation(word) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    }
}

// 어휘 삭제
async function deleteVocabulary(word) {
    if (!confirm(`'${word}' 단어를 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/vocabulary/${encodeURIComponent(word)}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ 단어가 삭제되었습니다.');
            refreshVocabularyList();
        } else {
            throw new Error('삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error deleting vocabulary:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// UI 유틸리티 함수들
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function showResult() {
    document.getElementById('vocabulary-result').classList.remove('hidden');
}

function hideResult() {
    document.getElementById('vocabulary-result').classList.add('hidden');
}

function disableGenerateButton(disable) {
    const button = document.getElementById('generate-btn');
    button.disabled = disable;
    if (disable) {
        button.textContent = '⏳ 생성 중...';
    } else {
        button.textContent = '🔍 생성하기';
    }
}

// 모달 관련 함수들
function showModal(content) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = content;
    modal.classList.remove('hidden');
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', handleEscKey);
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
    document.removeEventListener('keydown', handleEscKey);
}

function handleEscKey(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
}

// 모달 외부 클릭시 닫기
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// 간단한 알림 시스템
function showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 500;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);