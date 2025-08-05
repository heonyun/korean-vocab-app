// src/frameworks/WebSpeechAdapter.js
// WebSpeechAdapter Framework - Web Speech API를 래핑하는 어댑터

import { AudioConfig } from '../entities/AudioConfig.js';

export class WebSpeechAdapter {
  constructor() {
    this._activeUtterances = new Map(); // utteranceId -> utterance 매핑
    this._utteranceCounter = 0;
    this._eventListeners = new Map(); // eventType -> [listeners]
    this._maxConcurrentUtterances = 5;

    // 브라우저 지원 여부 확인
    if (!this.isSupported()) {
      console.warn('Web Speech API is not supported in this browser');
    }

    this._initializeEventListeners();
  }

  // Web Speech API 지원 여부 확인
  isSupported() {
    return typeof window !== 'undefined' && 
           'speechSynthesis' in window && 
           'SpeechSynthesisUtterance' in window;
  }

  // 브라우저별 특별한 처리가 필요한지 확인
  requiresVoiceLoading() {
    // Chrome에서는 voices가 비동기로 로드됨
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('chrome') && !userAgent.includes('edge');
  }

  requiresUserInteraction() {
    // Safari에서는 사용자 인터랙션이 필요함
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('safari') && !userAgent.includes('chrome');
  }

  // 지원되는 언어 목록 가져오기
  getSupportedLanguages() {
    if (!this.isSupported()) {
      return [];
    }

    const voices = speechSynthesis.getVoices();
    const languages = [...new Set(voices.map(voice => voice.lang))];
    return languages.sort();
  }

  // 특정 언어의 음성 목록 가져오기
  getVoicesForLanguage(language) {
    if (!this.isSupported()) {
      return [];
    }

    const voices = speechSynthesis.getVoices();
    return voices.filter(voice => voice.lang === language);
  }

  // 텍스트를 음성으로 재생
  async speak(text, config = null) {
    if (!this.isSupported()) {
      throw new Error('Web Speech API is not supported in this browser');
    }

    // 텍스트 유효성 검사
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error('Text cannot be empty');
    }

    // 설정 적용 (기본값 사용 또는 전달받은 설정)
    const audioConfig = config instanceof AudioConfig ? config : new AudioConfig(config);

    // 동시 재생 제한 확인
    if (this._activeUtterances.size >= this._maxConcurrentUtterances) {
      // 가장 오래된 utterance 중지
      const oldestId = [...this._activeUtterances.keys()][0];
      this.stopUtterance(oldestId);
    }

    // SpeechSynthesisUtterance 생성
    const utterance = new SpeechSynthesisUtterance(text.trim());
    const utteranceId = this._generateUtteranceId();

    // 설정 적용
    utterance.lang = audioConfig.language;
    utterance.rate = audioConfig.rate;
    utterance.pitch = audioConfig.pitch;
    utterance.volume = audioConfig.volume;

    // 적절한 음성 선택
    const voices = this.getVoicesForLanguage(audioConfig.language);
    if (voices.length > 0) {
      // 기본 음성 우선, 없으면 첫 번째 음성
      const defaultVoice = voices.find(voice => voice.default) || voices[0];
      utterance.voice = defaultVoice;
    }

    // 이벤트 핸들러 설정
    this._setupUtteranceEvents(utterance, utteranceId, text);

    // 활성 utterance 목록에 추가
    this._activeUtterances.set(utteranceId, utterance);

    // 음성 재생 시작
    try {
      speechSynthesis.speak(utterance);
      return utteranceId;
    } catch (error) {
      this._activeUtterances.delete(utteranceId);
      throw new Error(`Failed to start speech synthesis: ${error.message}`);
    }
  }

  // 모든 음성 재생 중지
  stop() {
    if (!this.isSupported()) {
      return;
    }

    speechSynthesis.cancel();
    this._activeUtterances.clear();
  }

  // 특정 utterance 중지
  stopUtterance(utteranceId) {
    if (!this._activeUtterances.has(utteranceId)) {
      return false;
    }

    // 특정 utterance만 중지하는 직접적인 방법이 없으므로
    // 전체 중지 후 나머지 재시작 (실제로는 복잡한 로직이 필요)
    const utterance = this._activeUtterances.get(utteranceId);
    this._activeUtterances.delete(utteranceId);
    
    // 간단한 구현: 전체 중지 (개선 필요)
    if (this._activeUtterances.size === 0) {
      speechSynthesis.cancel();
    }

    return true;
  }

  // 음성 재생 일시정지
  pause() {
    if (!this.isSupported()) {
      return;
    }

    speechSynthesis.pause();
  }

  // 일시정지된 음성 재개
  resume() {
    if (!this.isSupported()) {
      return;
    }

    speechSynthesis.resume();
  }

  // 현재 재생 상태 확인
  isSpeaking() {
    if (!this.isSupported()) {
      return false;
    }

    return speechSynthesis.speaking;
  }

  // 일시정지 상태 확인
  isPaused() {
    if (!this.isSupported()) {
      return false;
    }

    return speechSynthesis.paused;
  }

  // 대기 중인 utterance 확인
  isPending() {
    if (!this.isSupported()) {
      return false;
    }

    return speechSynthesis.pending;
  }

  // 활성 utterance 목록 가져오기
  getActiveUtterances() {
    return [...this._activeUtterances.keys()];
  }

  // 특정 utterance가 재생 중인지 확인
  isUtterancePlaying(utteranceId) {
    return this._activeUtterances.has(utteranceId) && this.isSpeaking();
  }

  // 이벤트 리스너 등록
  on(eventType, listener) {
    if (!this._eventListeners.has(eventType)) {
      this._eventListeners.set(eventType, []);
    }
    this._eventListeners.get(eventType).push(listener);
  }

  // 이벤트 리스너 제거
  off(eventType, listener) {
    if (!this._eventListeners.has(eventType)) {
      return;
    }

    const listeners = this._eventListeners.get(eventType);
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // 모든 이벤트 리스너 제거
  removeAllListeners(eventType = null) {
    if (eventType) {
      this._eventListeners.delete(eventType);
    } else {
      this._eventListeners.clear();
    }
  }

  // 정리 작업
  destroy() {
    this.stop();
    this.removeAllListeners();
    this._activeUtterances.clear();
  }

  // 고유한 utterance ID 생성
  _generateUtteranceId() {
    return `utterance_${++this._utteranceCounter}_${Date.now()}`;
  }

  // utterance 이벤트 설정
  _setupUtteranceEvents(utterance, utteranceId, text) {
    utterance.onstart = () => {
      this._emitEvent('start', { utteranceId, text });
    };

    utterance.onend = () => {
      this._activeUtterances.delete(utteranceId);
      this._emitEvent('end', { utteranceId, text });
    };

    utterance.onerror = (event) => {
      this._activeUtterances.delete(utteranceId);
      this._emitEvent('error', { utteranceId, text, error: event });
    };

    utterance.onpause = () => {
      this._emitEvent('pause', { utteranceId, text });
    };

    utterance.onresume = () => {
      this._emitEvent('resume', { utteranceId, text });
    };

    utterance.onmark = (event) => {
      this._emitEvent('mark', { utteranceId, text, mark: event });
    };

    utterance.onboundary = (event) => {
      this._emitEvent('boundary', { utteranceId, text, boundary: event });
    };
  }

  // 이벤트 발생
  _emitEvent(eventType, data) {
    if (!this._eventListeners.has(eventType)) {
      return;
    }

    const listeners = this._eventListeners.get(eventType);
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in ${eventType} event listener:`, error);
      }
    });
  }

  // 전역 이벤트 리스너 초기화
  _initializeEventListeners() {
    if (!this.isSupported()) {
      return;
    }

    // voiceschanged 이벤트 (Chrome에서 음성 목록 로드 완료 시)
    // 테스트 환경에서는 addEventListener가 없을 수 있으므로 안전하게 처리
    try {
      if (speechSynthesis && typeof speechSynthesis.addEventListener === 'function') {
        speechSynthesis.addEventListener('voiceschanged', () => {
          this._emitEvent('voiceschanged', { 
            voices: speechSynthesis.getVoices() 
          });
        });
      }
    } catch (error) {
      // 테스트 환경이나 일부 브라우저에서는 addEventListener가 지원되지 않을 수 있음
      console.warn('Failed to add voiceschanged event listener:', error.message);
    }
  }

  // 디버깅 정보 제공
  getDebugInfo() {
    return {
      isSupported: this.isSupported(),
      isSpeaking: this.isSpeaking(),
      isPaused: this.isPaused(),
      isPending: this.isPending(),
      activeUtterances: this.getActiveUtterances().length,
      supportedLanguages: this.getSupportedLanguages().length,
      requiresVoiceLoading: this.requiresVoiceLoading(),
      requiresUserInteraction: this.requiresUserInteraction(),
      userAgent: navigator.userAgent
    };
  }
}