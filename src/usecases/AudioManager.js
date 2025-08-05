// src/usecases/AudioManager.js
// AudioManager UseCase - 음성 재생 관리 핵심 비즈니스 로직

import { AudioConfig } from '../entities/AudioConfig.js';
import { PlaybackState, PLAYBACK_STATES } from '../entities/PlaybackState.js';

export class AudioManager {
  constructor(ttsAdapter) {
    if (!ttsAdapter) {
      throw new Error('TTS Adapter is required');
    }

    if (!ttsAdapter.isSupported()) {
      throw new Error('TTS is not supported in this browser');
    }

    this._ttsAdapter = ttsAdapter;
    this._config = new AudioConfig();
    this._state = new PlaybackState();
    this._currentAudioId = null;
    this._eventListeners = new Map();

    this._setupTTSEvents();
  }

  // 현재 상태 가져오기
  getCurrentState() {
    return this._state.current;
  }

  // 활성 오디오 목록 가져오기
  getActiveAudios() {
    return this._ttsAdapter.getActiveUtterances();
  }

  // 현재 설정 가져오기
  getCurrentConfig() {
    return this._config.clone();
  }

  // 텍스트를 음성으로 재생
  async playText(text) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error('Text cannot be empty');
    }

    try {
      // 현재 재생 중인 음성 중지
      await this.stopCurrent();

      // 재생 상태로 전환
      this._state.transitionTo(PLAYBACK_STATES.PLAYING);

      // TTS 어댑터를 통해 재생
      const audioId = await this._ttsAdapter.speak(text, this._config);
      this._currentAudioId = audioId;

      return audioId;
    } catch (error) {
      this._state.transitionTo(PLAYBACK_STATES.ERROR);
      this._emitEvent('error', error);
      throw error;
    }
  }

  // 현재 재생 중인 음성 중지
  async stopCurrent() {
    if (this._currentAudioId) {
      this._ttsAdapter.stopUtterance(this._currentAudioId);
      this._currentAudioId = null;
    }
    
    if (this._state.isActive()) {
      this._state.transitionTo(PLAYBACK_STATES.IDLE);
    }
  }

  // 모든 음성 중지
  async stopAll() {
    this._ttsAdapter.stop();
    this._currentAudioId = null;
    
    if (this._state.isActive()) {
      this._state.transitionTo(PLAYBACK_STATES.IDLE);
    }
  }

  // 설정 업데이트
  updateConfig(newConfig) {
    if (newConfig instanceof AudioConfig) {
      this._config = newConfig.clone();
    } else if (typeof newConfig === 'object') {
      this._config = new AudioConfig({
        ...this._config.toJSON(),
        ...newConfig
      });
    } else {
      throw new Error('Invalid config type');
    }
  }

  // TTS 완료 처리
  handleTTSComplete() {
    if (this._state.current === PLAYBACK_STATES.PLAYING) {
      this._state.transitionTo(PLAYBACK_STATES.COMPLETED);
      this._currentAudioId = null;
      this._emitEvent('complete', {});
    }
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

  // TTS 어댑터 이벤트 설정
  _setupTTSEvents() {
    this._ttsAdapter.on('end', (data) => {
      if (data.utteranceId === this._currentAudioId) {
        this.handleTTSComplete();
      }
    });

    this._ttsAdapter.on('error', (data) => {
      if (data.utteranceId === this._currentAudioId) {
        this._state.transitionTo(PLAYBACK_STATES.ERROR);
        this._currentAudioId = null;
        this._emitEvent('error', data.error);
      }
    });
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
}