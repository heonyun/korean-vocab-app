/**
 * Korean Learning Terminal - JavaScript
 * 터미널 인터페이스 클라이언트 로직
 */

class KoreanTerminal {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.currentMode = 'auto';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.stats = { translations: 0, commands: 0 };
        this.typingAnimation = true;
        this.autoScroll = true;
        
        // DOM 요소들
        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
        this.initializeWebSocket();
        this.setupKeyboardShortcuts();
    }

    initializeElements() {
        this.elements = {
            output: document.getElementById('terminal-output'),
            input: document.getElementById('terminal-input'),
            connectionStatus: document.getElementById('connection-status'),
            modeStatus: document.getElementById('mode-display'),
            statsDisplay: document.getElementById('stats-display'),
            loadingIndicator: document.getElementById('loading-indicator'),
            offlineModal: document.getElementById('offline-modal'),
            reconnectBar: document.getElementById('reconnect-bar'),
            reconnectStatus: document.getElementById('reconnect-status'),
            manualReconnect: document.getElementById('manual-reconnect'),
            shortcutsHelp: document.getElementById('shortcuts-help'),
            currentMode: document.getElementById('current-mode')
        };
    }

    setupEventListeners() {
        // 입력 필드 이벤트
        this.elements.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.elements.input.addEventListener('input', (e) => this.handleInput(e));
        
        // 재연결 버튼
        this.elements.manualReconnect.addEventListener('click', () => this.reconnectWebSocket());
        
        // 터미널 컨트롤 버튼들
        document.getElementById('minimizeBtn')?.addEventListener('click', () => this.minimizeTerminal());
        document.getElementById('maximizeBtn')?.addEventListener('click', () => this.maximizeTerminal());
        document.getElementById('closeBtn')?.addEventListener('click', () => this.closeTerminal());
        
        // 윈도우 포커스 이벤트
        window.addEventListener('focus', () => this.elements.input.focus());
        
        // 터미널 출력 클릭 시 입력 필드 포커스
        this.elements.output.addEventListener('click', () => this.elements.input.focus());
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+L: 화면 지우기
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.clearScreen();
            }
            
            // F1: 도움말 토글
            if (e.key === 'F1') {
                e.preventDefault();
                this.toggleHelp();
            }
            
            // Esc: 도움말 닫기 또는 입력 취소
            if (e.key === 'Escape') {
                if (!this.elements.shortcutsHelp.classList.contains('hidden')) {
                    this.toggleHelp();
                } else {
                    this.elements.input.value = '';
                    this.historyIndex = -1;
                }
            }
        });
    }

    initializeWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;
        
        try {
            this.websocket = new WebSocket(wsUrl);
            this.setupWebSocketEvents();
            this.updateConnectionStatus('connecting', '🟡 연결 중...');
        } catch (error) {
            console.error('WebSocket 초기화 실패:', error);
            this.handleConnectionError();
        }
    }

    setupWebSocketEvents() {
        this.websocket.onopen = () => {
            console.log('WebSocket 연결 성공');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected', '🟢 연결됨');
            this.hideOfflineModal();
            this.elements.input.focus();
        };

        this.websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            } catch (error) {
                console.error('메시지 파싱 오류:', error);
                this.addSystemMessage('메시지 형식 오류가 발생했습니다.', 'error');
            }
        };

        this.websocket.onclose = (event) => {
            console.log('WebSocket 연결 종료:', event.code, event.reason);
            this.isConnected = false;
            this.updateConnectionStatus('disconnected', '🔴 연결 끊어짐');
            
            if (event.code !== 1000) { // 정상 종료가 아닌 경우
                this.handleConnectionError();
            }
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket 오류:', error);
            this.handleConnectionError();
        };
    }

    handleWebSocketMessage(message) {
        console.log('수신된 메시지:', message);
        
        switch (message.type) {
            case 'connection':
                this.handleConnectionMessage(message);
                break;
            case 'translation':
                this.handleTranslationMessage(message);
                break;
            case 'command_result':
                this.handleCommandMessage(message);
                break;
            case 'stats':
                this.handleStatsMessage(message);
                break;
            case 'error':
                this.addSystemMessage(message.message, 'error');
                break;
            default:
                console.warn('알 수 없는 메시지 타입:', message.type);
        }
        
        this.hideLoadingIndicator();
    }

    handleConnectionMessage(message) {
        this.addSystemMessage(message.message, 'success');
        this.currentMode = message.mode || 'auto';
        this.updateModeDisplay();
    }

    handleTranslationMessage(message) {
        if (message.success) {
            this.addAIMessage(message.data);
            this.stats.translations++;
            this.updateStatsDisplay();
        } else {
            this.addSystemMessage(`번역 실패: ${message.error}`, 'error');
        }
    }

    handleCommandMessage(message) {
        if (message.success) {
            if (message.command_type === 'clear') {
                this.clearScreen();
            } else {
                this.addAIMessage(message.data);
            }
            this.stats.commands++;
            this.updateStatsDisplay();
        } else {
            this.addSystemMessage(`명령어 오류: ${message.error}`, 'error');
        }
    }

    handleStatsMessage(message) {
        this.stats = {
            translations: message.data.translation_count || 0,
            commands: message.data.command_count || 0
        };
        this.currentMode = message.data.current_mode || 'auto';
        this.updateStatsDisplay();
        this.updateModeDisplay();
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'Enter':
                if (!e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateHistory(-1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateHistory(1);
                break;
            case 'Tab':
                e.preventDefault();
                this.autocomplete();
                break;
        }
    }

    handleInput(e) {
        // 실시간 입력 피드백 (향후 구현)
        const value = e.target.value;
        if (value.startsWith('/')) {
            // 명령어 하이라이팅 등
        }
    }

    sendMessage() {
        const text = this.elements.input.value.trim();
        if (!text) return;

        if (!this.isConnected) {
            this.addSystemMessage('연결이 끊어져 있습니다. 재연결을 기다려주세요.', 'error');
            return;
        }

        // 사용자 메시지 표시
        this.addUserMessage(text);
        
        // 명령어 히스토리에 추가
        this.addToHistory(text);
        
        // 입력 필드 클리어
        this.elements.input.value = '';
        this.historyIndex = -1;
        
        // 로딩 표시
        this.showLoadingIndicator();
        
        // 메시지 전송
        const messageType = text.startsWith('/') ? 'command' : 'translate';
        const message = {
            type: messageType,
            text: text,
            mode: 'session' // 세션 모드 사용
        };
        
        this.websocket.send(JSON.stringify(message));
    }

    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-user';
        
        const timestamp = this.formatTimestamp();
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(text)}</div>
            <div class="message-timestamp">${timestamp}</div>
        `;
        
        this.elements.output.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addAIMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-ai';
        
        const timestamp = this.formatTimestamp();
        
        if (this.typingAnimation && content.includes('{{TYPING_START}}')) {
            // 타이핑 애니메이션 처리
            const cleanContent = content.replace(/\{\{TYPING_START\}\}|\{\{TYPING_END\}\}/g, '');
            messageDiv.innerHTML = `
                <div class="message-content"><span class="typing-cursor"></span></div>
                <div class="message-timestamp">${timestamp}</div>
            `;
            this.elements.output.appendChild(messageDiv);
            this.scrollToBottom();
            
            this.typeMessage(messageDiv.querySelector('.message-content'), cleanContent);
        } else {
            // 즉시 표시
            const cleanContent = content.replace(/\{\{TYPING_START\}\}|\{\{TYPING_END\}\}/g, '');
            messageDiv.innerHTML = `
                <div class="message-content">${this.escapeHtml(cleanContent)}</div>
                <div class="message-timestamp">${timestamp}</div>
            `;
            this.elements.output.appendChild(messageDiv);
            this.scrollToBottom();
        }
    }

    addSystemMessage(text, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-system message-${type}`;
        
        const timestamp = this.formatTimestamp();
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(text)}</div>
            <div class="message-timestamp">${timestamp}</div>
        `;
        
        this.elements.output.appendChild(messageDiv);
        this.scrollToBottom();
    }

    typeMessage(element, text) {
        let index = 0;
        const cursor = element.querySelector('.typing-cursor');
        
        const typeChar = () => {
            if (index < text.length) {
                const char = text.charAt(index);
                if (char === '\n') {
                    element.insertBefore(document.createElement('br'), cursor);
                } else {
                    element.insertBefore(document.createTextNode(char), cursor);
                }
                index++;
                setTimeout(typeChar, 50); // 타이핑 속도
            } else {
                cursor.remove(); // 타이핑 완료 후 커서 제거
            }
        };
        
        typeChar();
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        this.historyIndex += direction;
        
        if (this.historyIndex < 0) {
            this.historyIndex = -1;
            this.elements.input.value = '';
        } else if (this.historyIndex >= this.commandHistory.length) {
            this.historyIndex = this.commandHistory.length - 1;
        }
        
        if (this.historyIndex >= 0) {
            this.elements.input.value = this.commandHistory[this.historyIndex];
        }
    }

    autocomplete() {
        const value = this.elements.input.value;
        if (!value.startsWith('/')) return;
        
        const commands = ['/help', '/clear', '/mode korean', '/mode russian', '/mode auto'];
        const matches = commands.filter(cmd => cmd.startsWith(value));
        
        if (matches.length === 1) {
            this.elements.input.value = matches[0];
        } else if (matches.length > 1) {
            // 여러 매치가 있는 경우 공통 부분까지 자동완성
            let commonPrefix = matches[0];
            for (let i = 1; i < matches.length; i++) {
                let j = 0;
                while (j < commonPrefix.length && j < matches[i].length && 
                       commonPrefix[j] === matches[i][j]) {
                    j++;
                }
                commonPrefix = commonPrefix.substring(0, j);
            }
            this.elements.input.value = commonPrefix;
            
            // 가능한 명령어들을 시스템 메시지로 표시
            this.addSystemMessage(`가능한 명령어: ${matches.join(', ')}`, 'info');
        }
    }

    addToHistory(command) {
        if (this.commandHistory[this.commandHistory.length - 1] !== command) {
            this.commandHistory.push(command);
            if (this.commandHistory.length > 50) { // 히스토리 제한
                this.commandHistory.shift();
            }
        }
    }

    clearScreen() {
        // 환영 메시지만 남기고 모든 메시지 제거
        const messages = this.elements.output.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        
        this.addSystemMessage('화면이 지워졌습니다.', 'info');
    }

    showLoadingIndicator() {
        this.elements.loadingIndicator.classList.remove('hidden');
    }

    hideLoadingIndicator() {
        this.elements.loadingIndicator.classList.add('hidden');
    }

    updateConnectionStatus(status, text) {
        this.elements.connectionStatus.textContent = text;
        this.elements.connectionStatus.className = `status-item ${status}`;
    }

    updateModeDisplay() {
        const modeNames = {
            auto: '자동',
            korean: '한→러',
            russian: '러→한'
        };
        const modeName = modeNames[this.currentMode] || this.currentMode;
        this.elements.modeStatus.textContent = modeName;
        this.elements.currentMode.textContent = modeName;
    }

    updateStatsDisplay() {
        this.elements.statsDisplay.textContent = 
            `번역: ${this.stats.translations} | 명령어: ${this.stats.commands}`;
    }

    handleConnectionError() {
        this.isConnected = false;
        this.updateConnectionStatus('disconnected', '🔴 연결 끊어짐');
        this.showOfflineModal();
        this.attemptReconnect();
    }

    showOfflineModal() {
        this.elements.offlineModal.classList.remove('hidden');
    }

    hideOfflineModal() {
        this.elements.offlineModal.classList.add('hidden');
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.elements.reconnectStatus.textContent = '재연결 실패. 수동으로 재연결하세요.';
            return;
        }

        this.reconnectAttempts++;
        this.elements.reconnectStatus.textContent = 
            `재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`;
        
        const progress = (this.reconnectAttempts / this.maxReconnectAttempts) * 100;
        this.elements.reconnectBar.style.width = `${progress}%`;

        setTimeout(() => {
            if (!this.isConnected) {
                this.reconnectWebSocket();
            }
        }, this.reconnectDelay);
    }

    reconnectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
        }
        this.initializeWebSocket();
    }

    toggleHelp() {
        this.elements.shortcutsHelp.classList.toggle('hidden');
    }

    minimizeTerminal() {
        // 터미널 최소화 효과 (시각적 효과만)
        document.querySelector('.terminal-container').style.transform = 'scale(0.9)';
        setTimeout(() => {
            document.querySelector('.terminal-container').style.transform = 'scale(1)';
        }, 200);
    }

    maximizeTerminal() {
        // 전체화면 토글
        const container = document.querySelector('.terminal-container');
        container.classList.toggle('fullscreen');
    }

    closeTerminal() {
        // 터미널 닫기 확인
        if (confirm('터미널을 닫으시겠습니까?')) {
            window.close();
        }
    }

    scrollToBottom() {
        if (this.autoScroll) {
            this.elements.output.scrollTop = this.elements.output.scrollHeight;
        }
    }

    formatTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString('ko-KR', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 터미널 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.terminal = new KoreanTerminal();
    
    // 개발자 도구용 전역 함수들
    window.terminalUtils = {
        sendTestMessage: (text) => window.terminal.addUserMessage(text),
        clearScreen: () => window.terminal.clearScreen(),
        showStats: () => console.log(window.terminal.stats),
        reconnect: () => window.terminal.reconnectWebSocket()
    };
    
    console.log('🚀 Korean Learning Terminal 초기화 완료');
    console.log('💡 개발자 도구에서 terminalUtils 객체를 사용할 수 있습니다.');
});

// 전역 에러 핸들러
window.addEventListener('error', (e) => {
    console.error('전역 오류:', e.error);
    if (window.terminal) {
        window.terminal.addSystemMessage('예상치 못한 오류가 발생했습니다.', 'error');
    }
});

// 연결 상태 모니터링
window.addEventListener('online', () => {
    if (window.terminal) {
        window.terminal.addSystemMessage('인터넷 연결이 복구되었습니다.', 'success');
        if (!window.terminal.isConnected) {
            window.terminal.reconnectWebSocket();
        }
    }
});

window.addEventListener('offline', () => {
    if (window.terminal) {
        window.terminal.addSystemMessage('인터넷 연결이 끊어졌습니다.', 'warning');
    }
});