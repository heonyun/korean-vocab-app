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
            currentMode: document.getElementById('current-mode'),
            
            // 네비게이션 및 사이드바 요소들
            hamburgerMenu: document.getElementById('hamburgerMenu'),
            sidebarMenu: document.getElementById('sidebarMenu'),
            sidebarOverlay: document.getElementById('sidebarOverlay'),
            closeSidebar: document.getElementById('closeSidebar'),
            settingsBtn: document.getElementById('settingsBtn'),
            helpBtn: document.getElementById('helpBtn'),
            
            // 사이드바 기능 버튼들
            quickHelpBtn: document.getElementById('quickHelpBtn'),
            quickClearBtn: document.getElementById('quickClearBtn'),
            quickCopyBtn: document.getElementById('quickCopyBtn'),
            newSessionBtn: document.getElementById('newSessionBtn'),
            sessionList: document.getElementById('sessionList')
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
        
        // 네비게이션 및 사이드바 이벤트
        this.elements.hamburgerMenu?.addEventListener('click', () => this.toggleSidebar());
        this.elements.closeSidebar?.addEventListener('click', () => this.closeSidebar());
        this.elements.sidebarOverlay?.addEventListener('click', () => this.closeSidebar());
        this.elements.helpBtn?.addEventListener('click', () => this.showHelp());
        this.elements.settingsBtn?.addEventListener('click', () => this.showSettings());
        
        // 사이드바 빠른 기능 버튼들
        this.elements.quickHelpBtn?.addEventListener('click', () => this.executeCommand('/help'));
        this.elements.quickClearBtn?.addEventListener('click', () => this.executeCommand('/clear'));
        this.elements.quickCopyBtn?.addEventListener('click', () => this.copyLastTranslation());
        this.elements.newSessionBtn?.addEventListener('click', () => this.createNewSession());
        
        // 모드 변경 버튼들
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.executeCommand(`/mode ${mode}`);
                this.updateModeButtons(mode);
            });
        });
        
        // 테마 변경 버튼들
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.changeTheme(theme);
                this.updateThemeButtons(theme);
            });
        });
        
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
            
            // 입력 필드 포커스 (약간의 지연을 둠)
            setTimeout(() => {
                if (this.elements.input) {
                    this.elements.input.focus();
                    this.elements.input.click();
                }
            }, 100);
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

        if (!this.isConnected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            this.addSystemMessage('연결이 끊어져 있습니다. 재연결을 시도합니다...', 'error');
            this.reconnectWebSocket();
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
        
        try {
            this.websocket.send(JSON.stringify(message));
        } catch (error) {
            console.error('메시지 전송 실패:', error);
            this.addSystemMessage('메시지 전송에 실패했습니다. 재연결을 시도합니다.', 'error');
            this.hideLoadingIndicator();
            this.reconnectWebSocket();
        }
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
        
        // 메시지 추가 후 스크롤 (약간의 지연을 두어 렌더링 완료 대기)
        setTimeout(() => {
            this.scrollToBottom();
        }, 100);
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
        
        // 메시지 추가 후 스크롤 (약간의 지연을 두어 렌더링 완료 대기)
        setTimeout(() => {
            this.scrollToBottom();
        }, 100);
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
            this.websocket = null;
        }
        this.isConnected = false;
        
        // 짧은 대기 후 재연결
        setTimeout(() => {
            this.initializeWebSocket();
        }, 1000);
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
        if (this.autoScroll && this.elements.output) {
            const outputElement = this.elements.output;
            
            // 강제 스크롤 - 여러 방법으로 시도
            try {
                // 방법 1: 즉시 스크롤
                outputElement.scrollTop = outputElement.scrollHeight;
                
                // 방법 2: 다음 프레임에서 스크롤
                requestAnimationFrame(() => {
                    outputElement.scrollTop = outputElement.scrollHeight;
                });
                
                // 방법 3: 마지막 요소로 스크롤
                setTimeout(() => {
                    const lastMessage = outputElement.lastElementChild;
                    if (lastMessage) {
                        lastMessage.scrollIntoView({ 
                            behavior: 'auto', 
                            block: 'end', 
                            inline: 'nearest' 
                        });
                    }
                }, 10);
                
                // 방법 4: 확실한 스크롤 (200ms 후)
                setTimeout(() => {
                    outputElement.scrollTop = outputElement.scrollHeight;
                }, 200);
                
            } catch (error) {
                console.error('스크롤 오류:', error);
            }
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

    // 사이드바 관련 메서드들
    toggleSidebar() {
        const isOpen = !this.elements.sidebarMenu.classList.contains('hidden');
        if (isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        this.elements.sidebarMenu.classList.remove('hidden');
        this.elements.sidebarOverlay.classList.remove('hidden');
        this.elements.hamburgerMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeSidebar() {
        this.elements.sidebarMenu.classList.add('hidden');
        this.elements.sidebarOverlay.classList.add('hidden');
        this.elements.hamburgerMenu.classList.remove('active');
        document.body.style.overflow = '';
    }

    // 명령어 실행 (버튼에서 호출)
    executeCommand(command) {
        this.elements.input.value = command;
        this.sendMessage();
        this.closeSidebar();
    }

    // 마지막 번역 결과 복사
    copyLastTranslation() {
        const lastAIMessage = this.elements.output.querySelector('.message-ai:last-of-type .message-content');
        if (lastAIMessage) {
            const textToCopy = lastAIMessage.textContent || lastAIMessage.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.addSystemMessage('번역 결과가 클립보드에 복사되었습니다.', 'success');
            }).catch(() => {
                this.addSystemMessage('복사에 실패했습니다.', 'error');
            });
        } else {
            this.addSystemMessage('복사할 번역 결과가 없습니다.', 'warning');
        }
        this.closeSidebar();
    }

    // 새 세션 생성
    createNewSession() {
        this.clearScreen();
        // 새 세션 ID 생성 및 저장 로직 (향후 구현)
        this.addSystemMessage('새 세션이 시작되었습니다.', 'success');
        this.closeSidebar();
    }

    // 모드 버튼 업데이트
    updateModeButtons(activeMode) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === activeMode) {
                btn.classList.add('active');
            }
        });
    }

    // 테마 변경
    changeTheme(theme) {
        const container = document.querySelector('.terminal-container');
        // 기존 테마 클래스 제거
        container.classList.remove('theme-terminal', 'theme-warm', 'theme-soft');
        
        // 새 테마 적용
        if (theme !== 'terminal') {
            container.classList.add(`theme-${theme}`);
        }
        
        // 테마 설정 저장
        localStorage.setItem('terminal-theme', theme);
    }

    // 테마 버튼 업데이트
    updateThemeButtons(activeTheme) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === activeTheme) {
                btn.classList.add('active');
            }
        });
    }

    // 도움말 표시
    showHelp() {
        this.executeCommand('/help');
    }

    // 설정 표시 (향후 구현)
    showSettings() {
        this.addSystemMessage('설정 기능은 곧 추가될 예정입니다.', 'info');
    }
}

// 터미널 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 지연을 두고 초기화 (DOM 완전 로드 대기)
    setTimeout(() => {
        window.terminal = new KoreanTerminal();
        
        // 개발자 도구용 전역 함수들
        window.terminalUtils = {
            sendTestMessage: (text) => window.terminal.addUserMessage(text),
            clearScreen: () => window.terminal.clearScreen(),
            showStats: () => console.log(window.terminal.stats),
            reconnect: () => window.terminal.reconnectWebSocket(),
            focusInput: () => window.terminal.elements.input.focus(),
            scrollToBottom: () => window.terminal.scrollToBottom(),
            checkScroll: () => {
                const output = window.terminal.elements.output;
                console.log('스크롤 정보:', {
                    scrollTop: output.scrollTop,
                    scrollHeight: output.scrollHeight,
                    clientHeight: output.clientHeight,
                    offsetHeight: output.offsetHeight,
                    isAtBottom: output.scrollTop + output.clientHeight >= output.scrollHeight - 10,
                    canScroll: output.scrollHeight > output.clientHeight
                });
            },
            addTestMessages: () => {
                for (let i = 1; i <= 20; i++) {
                    window.terminal.addUserMessage(`테스트 메시지 ${i} - 스크롤 테스트를 위한 긴 메시지입니다. 이 메시지가 충분히 많아지면 스크롤이 생겨야 합니다.`);
                }
            }
        };
        
        console.log('🚀 Korean Learning Terminal 초기화 완료');
        console.log('💡 개발자 도구에서 terminalUtils 객체를 사용할 수 있습니다.');
        console.log('🔧 입력이 안 되면 F12 개발자도구에서 terminalUtils.focusInput() 실행해보세요.');
    }, 200);
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