// src/usecases/PlaybackController.js
// PlaybackController UseCase - 어휘 항목 재생 제어 비즈니스 로직

export class PlaybackController {
  constructor(audioManager) {
    if (!audioManager) {
      throw new Error('AudioManager is required');
    }

    this._audioManager = audioManager;
    this._currentlyPlaying = null;
    this._playQueue = [];
    this._playHistory = [];
    this._maxHistorySize = 50;
    this._eventListeners = new Map();

    // AudioManager 이벤트 리스너 설정
    this._setupAudioManagerEvents();
  }

  // 현재 재생 중인 항목 반환
  getCurrentlyPlaying() {
    return this._currentlyPlaying;
  }

  // 재생 큐 반환
  getPlayQueue() {
    return [...this._playQueue]; // 복사본 반환
  }

  // 재생 히스토리 반환
  getPlayHistory() {
    return [...this._playHistory]; // 복사본 반환
  }

  // 특정 예문 재생
  async playExample(entry, exampleIndex) {
    if (!entry || !entry.examples || !Array.isArray(entry.examples)) {
      throw new Error('Invalid vocabulary entry');
    }

    if (typeof exampleIndex !== 'number' || exampleIndex < 0 || exampleIndex >= entry.examples.length) {
      throw new Error(`Example index ${exampleIndex} is out of range`);
    }

    try {
      // 현재 재생 중지
      await this.stopCurrent();

      // 예문 텍스트 재생
      const text = entry.examples[exampleIndex];
      const audioId = await this._audioManager.playText(text);

      // 현재 재생 정보 설정
      const playingInfo = {
        entry,
        exampleIndex,
        audioId
      };

      this._currentlyPlaying = playingInfo;

      // 히스토리에 추가
      this._addToHistory(entry, exampleIndex, audioId);

      // 이벤트 발생
      this._emitEvent('play', playingInfo);

      return audioId;
    } catch (error) {
      this._emitEvent('error', error);
      throw error;
    }
  }

  // 단어 자체 재생
  async playWord(entry) {
    if (!entry || !entry.koreanWord) {
      throw new Error('Invalid vocabulary entry');
    }

    try {
      // 현재 재생 중지
      await this.stopCurrent();

      // 단어 재생
      const audioId = await this._audioManager.playText(entry.koreanWord);

      // 현재 재생 정보 설정
      const playingInfo = {
        entry,
        exampleIndex: null, // 단어 재생시에는 null
        audioId
      };

      this._currentlyPlaying = playingInfo;

      // 히스토리에 추가
      this._addToHistory(entry, null, audioId);

      // 이벤트 발생
      this._emitEvent('play', playingInfo);

      return audioId;
    } catch (error) {
      this._emitEvent('error', error);
      throw error;
    }
  }

  // 큐에 재생 항목 추가
  addToQueue(entry, exampleIndex) {
    if (!entry) {
      throw new Error('Entry is required');
    }

    if (exampleIndex !== null && (typeof exampleIndex !== 'number' || exampleIndex < 0 || exampleIndex >= entry.examples.length)) {
      throw new Error(`Example index ${exampleIndex} is out of range`);
    }

    const queueItem = {
      entry,
      exampleIndex
    };

    this._playQueue.push(queueItem);
    this._emitEvent('queueAdd', queueItem);
  }

  // 큐의 다음 항목 재생
  async playNext() {
    if (this._playQueue.length === 0) {
      return null;
    }

    const nextItem = this._playQueue.shift();
    
    try {
      let audioId;
      if (nextItem.exampleIndex === null) {
        audioId = await this.playWord(nextItem.entry);
      } else {
        audioId = await this.playExample(nextItem.entry, nextItem.exampleIndex);
      }

      this._emitEvent('queueNext', nextItem);
      return audioId;
    } catch (error) {
      this._emitEvent('error', error);
      throw error;
    }
  }

  // 큐 초기화
  clearQueue() {
    this._playQueue = [];
    this._emitEvent('queueClear', {});
  }

  // 히스토리 최대 크기 설정
  setMaxHistorySize(size) {
    if (typeof size !== 'number' || size < 1) {
      throw new Error('History size must be a positive number');
    }

    this._maxHistorySize = size;

    // 현재 히스토리가 새로운 크기를 초과하면 자르기
    if (this._playHistory.length > size) {
      this._playHistory = this._playHistory.slice(-size);
    }
  }

  // 히스토리 초기화
  clearHistory() {
    this._playHistory = [];
    this._emitEvent('historyClear', {});
  }

  // 현재 재생 중지
  async stopCurrent() {
    if (this._currentlyPlaying) {
      await this._audioManager.stopCurrent();
      const stoppedInfo = this._currentlyPlaying;
      this._currentlyPlaying = null;
      this._emitEvent('stop', stoppedInfo);
    }
  }

  // 모든 재생 중지 및 큐 초기화
  async stopAll() {
    await this._audioManager.stopAll();
    this._currentlyPlaying = null;
    this.clearQueue();
    this._emitEvent('stopAll', {});
  }

  // 재생 완료 처리
  async handlePlaybackComplete() {
    const completedInfo = this._currentlyPlaying;
    this._currentlyPlaying = null;

    this._emitEvent('complete', completedInfo);

    // 큐에 다음 항목이 있으면 자동 재생
    if (this._playQueue.length > 0) {
      try {
        await this.playNext();
      } catch (error) {
        console.error('Failed to play next item in queue:', error);
        this._emitEvent('error', error);
      }
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

  // 히스토리에 항목 추가 (내부 메서드)
  _addToHistory(entry, exampleIndex, audioId) {
    const historyItem = {
      entry,
      exampleIndex,
      audioId,
      timestamp: new Date()
    };

    this._playHistory.push(historyItem);

    // 히스토리 크기 제한 적용
    if (this._playHistory.length > this._maxHistorySize) {
      this._playHistory.shift(); // 가장 오래된 항목 제거
    }
  }

  // AudioManager 이벤트 설정 (내부 메서드)
  _setupAudioManagerEvents() {
    this._audioManager.on('complete', () => {
      this.handlePlaybackComplete();
    });

    this._audioManager.on('error', (error) => {
      this._currentlyPlaying = null;
      this._emitEvent('error', error);
    });
  }

  // 이벤트 발생 (내부 메서드)
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