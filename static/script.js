// 상수 정의 (임시로 여기에 직접 정의)
const STORAGE_KEYS = {
    VOCABULARY_DATA: 'vocabulary_data',
    THEME: 'theme',
    TTS_PLAYBACK_RATE: 'tts-playback-rate'
};

const API_ENDPOINTS = {
    GENERATE_VOCABULARY: '/api/generate-vocabulary',
    VOCABULARY: '/api/vocabulary'
};

const VALIDATION = {
    KOREAN_REGEX: /^[가-힣0-9\s.,!?~\-()]+$/,
    MIN_WORD_LENGTH: 1,
    MAX_WORD_LENGTH: 50,
    MAX_SENTENCE_LENGTH: 200
};

const ERROR_MESSAGES = {
    EMPTY_INPUT: '한국어 단어를 입력해주세요!',
    INVALID_KOREAN: '한국어 문자만 입력 가능합니다.',
    TOO_SHORT: `최소 ${VALIDATION.MIN_WORD_LENGTH}글자 이상 입력해주세요.`,
    TOO_LONG: `최대 ${VALIDATION.MAX_WORD_LENGTH}글자까지 입력 가능합니다.`,
    NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
    SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    GENERATION_FAILED: '어휘 생성에 실패했습니다.',
    SAVE_FAILED: '저장에 실패했습니다.',
    DELETE_FAILED: '삭제에 실패했습니다.',
    LOAD_FAILED: '데이터를 불러올 수 없습니다.'
};

const SUCCESS_MESSAGES = {
    VOCABULARY_GENERATED: '✅ 어휘가 성공적으로 생성되었습니다!',
    VOCABULARY_SAVED: '✅ 어휘가 노트에 저장되었습니다!',
    VOCABULARY_DELETED: '✅ 단어가 삭제되었습니다.',
    THEME_CHANGED: '테마가 변경되었습니다.',
    NETWORK_RESTORED: '🌐 인터넷에 연결되었습니다'
};

const UI_CONSTANTS = {
    NOTIFICATION_DURATION: 3000,
    LOADING_DELAY: 500,
    MAX_RECENT_WORDS: 5
};

// 전역 변수
let currentVocabularyData = null;

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // 엔터키로 어휘 생성
    const input = document.getElementById('korean-word-input');
    const generateBtn = document.getElementById('generate-btn');
    
    // Enter 키 이벤트 처리
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !generateBtn.disabled) {
            e.preventDefault();
            generateVocabulary();
        }
    });
    
    // 실시간 입력 유효성 검사
    input.addEventListener('input', function(e) {
        const validation = validateKoreanInput(e.target.value);
        const inputElement = e.target;
        
        // 입력 필드 스타일링
        if (e.target.value.trim() && !validation.valid) {
            inputElement.style.borderColor = '#f44336';
            inputElement.title = validation.message;
        } else {
            inputElement.style.borderColor = '';
            inputElement.title = '';
        }
    });
    
    // 페이지 로드시 저장된 어휘 목록 새로고침
    refreshVocabularyList();
});

// 입력 유효성 검사 함수
function validateKoreanInput(word) {
    if (!word || word.trim() === '') {
        return { valid: false, message: ERROR_MESSAGES.EMPTY_INPUT };
    }
    
    const trimmedWord = word.trim();
    
    if (trimmedWord.length < VALIDATION.MIN_WORD_LENGTH) {
        return { valid: false, message: ERROR_MESSAGES.TOO_SHORT };
    }
    
    if (trimmedWord.length > VALIDATION.MAX_WORD_LENGTH) {
        return { valid: false, message: ERROR_MESSAGES.TOO_LONG };
    }
    
    if (!VALIDATION.KOREAN_REGEX.test(trimmedWord)) {
        return { valid: false, message: ERROR_MESSAGES.INVALID_KOREAN };
    }
    
    return { valid: true, word: trimmedWord };
}

// 어휘 생성 함수
async function generateVocabulary() {
    const input = document.getElementById('korean-word-input');
    const word = input.value.trim();
    
    // 향상된 입력 유효성 검사
    const validation = validateKoreanInput(word);
    if (!validation.valid) {
        showNotification(validation.message, 'error');
        input.focus();
        return;
    }
    
    // UI 상태 변경
    showLoading(true);
    hideResult();
    disableGenerateButton(true);
    
    try {
        const response = await fetch(API_ENDPOINTS.GENERATE_VOCABULARY, {
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
            showNotification(SUCCESS_MESSAGES.VOCABULARY_GENERATED, 'success');
        } else {
            throw new Error(data.error || ERROR_MESSAGES.GENERATION_FAILED);
        }
        
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = ERROR_MESSAGES.GENERATION_FAILED;
        
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
            errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
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
            <div class="example-header">
                <div class="example-korean">${example.korean_sentence}</div>
                <button onclick="playExamplePronunciation('${example.korean_sentence.replace(/'/g, "\\'")}', ${index})" 
                        class="example-play-btn" title="발음 듣기">🔊</button>
            </div>
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
        playKoreanText(word);
    }
}

// 예제 발음 재생
function playExamplePronunciation(sentence, index) {
    if (sentence) {
        playKoreanText(sentence, index);
    }
}

// 한국어 텍스트 음성 재생 (공통 함수)
function playKoreanText(text, exampleIndex = null) {
    if (!text) return;
    
    // 브라우저 TTS 지원 확인
    if (!('speechSynthesis' in window)) {
        alert('이 브라우저는 음성 재생을 지원하지 않습니다.');
        return;
    }
    
    try {
        // 현재 재생 중인 음성 중지
        window.speechSynthesis.cancel();
        
        // 음성 재생 설정
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = getPlaybackRate(); // 사용자 설정 속도
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // 재생 중 시각적 피드백
        const playingClass = 'playing-audio';
        let targetButton = null;
        
        if (exampleIndex !== null) {
            // 예제 버튼 찾기
            const exampleItems = document.querySelectorAll('.example-item');
            if (exampleItems[exampleIndex]) {
                targetButton = exampleItems[exampleIndex].querySelector('.example-play-btn');
            }
        } else {
            // 메인 재생 버튼
            targetButton = document.querySelector('.play-btn');
        }
        
        // 재생 시작 이벤트
        utterance.onstart = () => {
            console.log(`🔊 음성 재생 시작: ${text}`);
            if (targetButton) {
                targetButton.classList.add(playingClass);
                targetButton.textContent = '⏸️';
                targetButton.title = '재생 중...';
            }
        };
        
        // 재생 완료 이벤트
        utterance.onend = () => {
            console.log('🔇 음성 재생 완료');
            if (targetButton) {
                targetButton.classList.remove(playingClass);
                targetButton.textContent = '🔊';
                targetButton.title = '발음 듣기';
            }
        };
        
        // 재생 오류 이벤트
        utterance.onerror = (event) => {
            console.error('❌ 음성 재생 오류:', event.error);
            if (targetButton) {
                targetButton.classList.remove(playingClass);
                targetButton.textContent = '🔊';
                targetButton.title = '발음 듣기';
            }
            alert('음성 재생 중 오류가 발생했습니다.');
        };
        
        // 음성 재생 시작
        window.speechSynthesis.speak(utterance);
        
    } catch (error) {
        console.error('❌ TTS 오류:', error);
        alert('음성 재생에 실패했습니다.');
    }
}

// 재생 속도 가져오기 (localStorage에서)
function getPlaybackRate() {
    const savedRate = localStorage.getItem(STORAGE_KEYS.TTS_PLAYBACK_RATE);
    return savedRate ? parseFloat(savedRate) : 0.8; // 기본값 0.8 (조금 느리게)
}

// 재생 속도 설정
function setPlaybackRate(rate) {
    localStorage.setItem(STORAGE_KEYS.TTS_PLAYBACK_RATE, rate.toString());
}

// 어휘 저장 (이미 자동으로 저장되므로 알림만)
function saveVocabulary() {
    if (currentVocabularyData) {
        showNotification(SUCCESS_MESSAGES.VOCABULARY_SAVED, 'success');
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
        const response = await fetch(API_ENDPOINTS.VOCABULARY);
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
        showNotification(ERROR_MESSAGES.LOAD_FAILED, 'error');
    }
}

// 어휘 상세보기
async function showVocabularyDetail(word) {
    try {
        const response = await fetch(`${API_ENDPOINTS.VOCABULARY}/${encodeURIComponent(word)}`);
        const data = await response.json();
        
        if (data) {
            showModal(createVocabularyDetailHTML(data));
        }
    } catch (error) {
        console.error('Error showing vocabulary detail:', error);
        showNotification(ERROR_MESSAGES.LOAD_FAILED, 'error');
    }
}

// 어휘 상세 HTML 생성
function createVocabularyDetailHTML(data) {
    let examplesHTML = '';
    data.usage_examples.forEach((example, index) => {
        examplesHTML += `
            <div class="example-item">
                <div class="example-header">
                    <div class="example-korean">${example.korean_sentence}</div>
                    <button onclick="playExamplePronunciation('${example.korean_sentence.replace(/'/g, "\\'")}', ${index})" 
                            class="example-play-btn" title="발음 듣기">🔊</button>
                </div>
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
        const response = await fetch(`${API_ENDPOINTS.VOCABULARY}/${encodeURIComponent(word)}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(SUCCESS_MESSAGES.VOCABULARY_DELETED, 'success');
            refreshVocabularyList();
        } else {
            throw new Error(ERROR_MESSAGES.DELETE_FAILED);
        }
    } catch (error) {
        console.error('Error deleting vocabulary:', error);
        showNotification(ERROR_MESSAGES.DELETE_FAILED, 'error');
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

// 향상된 알림 시스템
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
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336', 
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 500;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
    `;
    
    // 클릭으로 알림 닫기
    notification.addEventListener('click', () => {
        notification.remove();
    });
    
    document.body.appendChild(notification);
    
    // 설정된 시간 후 자동 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, UI_CONSTANTS.NOTIFICATION_DURATION);
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
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification:hover {
        transform: scale(1.02);
        transition: transform 0.2s ease;
    }
`;
document.head.appendChild(style);