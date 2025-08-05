// src/entities/PlaybackState.js
// PlaybackState Entity - 재생 상태를 관리하는 핵심 비즈니스 객체

// 재생 상태 열거형
export const PLAYBACK_STATES = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
};

// 상태 전환 규칙 정의
const STATE_TRANSITIONS = {
  [PLAYBACK_STATES.IDLE]: [PLAYBACK_STATES.PLAYING, PLAYBACK_STATES.ERROR],
  [PLAYBACK_STATES.PLAYING]: [PLAYBACK_STATES.PAUSED, PLAYBACK_STATES.COMPLETED, PLAYBACK_STATES.ERROR, PLAYBACK_STATES.IDLE],
  [PLAYBACK_STATES.PAUSED]: [PLAYBACK_STATES.PLAYING, PLAYBACK_STATES.COMPLETED, PLAYBACK_STATES.ERROR, PLAYBACK_STATES.IDLE],
  [PLAYBACK_STATES.COMPLETED]: [PLAYBACK_STATES.IDLE],
  [PLAYBACK_STATES.ERROR]: [PLAYBACK_STATES.IDLE]
};

export class PlaybackState {
  constructor(initialState = PLAYBACK_STATES.IDLE) {
    this._current = initialState;
    this._previousState = null;
    this._timestamp = new Date();
    this._history = [{
      state: initialState,
      timestamp: this._timestamp,
      from: null
    }];
    this._maxHistorySize = 50; // 기본 히스토리 크기 제한

    // 초기 상태 유효성 검사
    if (!Object.values(PLAYBACK_STATES).includes(initialState)) {
      throw new Error(`Invalid initial state: ${initialState}`);
    }
  }

  // 현재 상태 getter
  get current() {
    return this._current;
  }

  // 이전 상태 getter
  get previousState() {
    return this._previousState;
  }

  // 타임스탬프 getter
  get timestamp() {
    return this._timestamp;
  }

  // 특정 상태로 전환 가능한지 확인
  canTransitionTo(targetState) {
    if (!Object.values(PLAYBACK_STATES).includes(targetState)) {
      return false;
    }

    const allowedTransitions = STATE_TRANSITIONS[this._current];
    return allowedTransitions.includes(targetState);
  }

  // 상태 전환 실행
  transitionTo(targetState) {
    if (!this.canTransitionTo(targetState)) {
      throw new Error(`Invalid state transition from ${this._current} to ${targetState}`);
    }

    const oldState = this._current;
    this._previousState = oldState;
    this._current = targetState;
    this._timestamp = new Date();

    // 히스토리에 추가
    this._addToHistory(targetState, oldState);

    return true;
  }

  // 이전 상태로 되돌리기
  revertToPrevious() {
    if (!this._previousState) {
      return false;
    }

    if (!this.canTransitionTo(this._previousState)) {
      return false;
    }

    const targetState = this._previousState;
    this._previousState = this._current;
    this._current = targetState;
    this._timestamp = new Date();

    // 히스토리에 추가
    this._addToHistory(targetState, this._previousState);

    return true;
  }

  // 상태 히스토리 가져오기
  getHistory() {
    return [...this._history]; // 복사본 반환
  }

  // 히스토리 크기 제한 설정
  setMaxHistorySize(size) {
    if (typeof size !== 'number' || size < 1) {
      throw new Error('History size must be a positive number');
    }
    this._maxHistorySize = size;
    
    // 현재 히스토리가 새로운 크기를 초과하면 자르기
    if (this._history.length > size) {
      this._history = this._history.slice(-size);
    }
  }

  // 현재 상태가 특정 상태인지 확인
  is(state) {
    return this._current === state;
  }

  // 현재 상태가 여러 상태 중 하나인지 확인
  isOneOf(states) {
    return states.includes(this._current);
  }

  // 재생 중인지 확인 (PLAYING 또는 PAUSED)
  isActive() {
    return this.isOneOf([PLAYBACK_STATES.PLAYING, PLAYBACK_STATES.PAUSED]);
  }

  // 완료된 상태인지 확인
  isFinished() {
    return this.isOneOf([PLAYBACK_STATES.COMPLETED, PLAYBACK_STATES.ERROR]);
  }

  // 상태를 IDLE로 리셋
  reset() {
    this._current = PLAYBACK_STATES.IDLE;
    this._previousState = null;
    this._timestamp = new Date();
    
    // 히스토리에 리셋 기록 추가
    this._addToHistory(PLAYBACK_STATES.IDLE, null);
  }

  // 상태 정보를 문자열로 변환
  toString() {
    return `PlaybackState(current=${this._current}, previous=${this._previousState}, timestamp=${this._timestamp.toISOString()})`;
  }

  // 상태 정보를 JSON으로 변환
  toJSON() {
    return {
      current: this._current,
      previousState: this._previousState,
      timestamp: this._timestamp.toISOString(),
      history: this._history
    };
  }

  // JSON에서 PlaybackState 생성
  static fromJSON(json) {
    const state = new PlaybackState(json.current);
    state._previousState = json.previousState;
    state._timestamp = new Date(json.timestamp);
    state._history = json.history.map(entry => ({
      ...entry,
      timestamp: new Date(entry.timestamp)
    }));
    return state;
  }

  // 히스토리에 항목 추가 (내부 메서드)
  _addToHistory(state, fromState) {
    const entry = {
      state,
      from: fromState,
      timestamp: new Date()
    };

    this._history.push(entry);

    // 히스토리 크기 제한 적용
    if (this._history.length > this._maxHistorySize) {
      this._history.shift(); // 가장 오래된 항목 제거
    }
  }

  // 특정 기간 동안의 상태 변화 조회
  getHistoryInRange(startTime, endTime) {
    return this._history.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );
  }

  // 특정 상태의 총 지속 시간 계산
  getTotalDuration(state) {
    let totalDuration = 0;
    let currentStart = null;

    for (let i = 0; i < this._history.length; i++) {
      const entry = this._history[i];
      
      if (entry.state === state && currentStart === null) {
        currentStart = entry.timestamp;
      } else if (entry.state !== state && currentStart !== null) {
        totalDuration += entry.timestamp - currentStart;
        currentStart = null;
      }
    }

    // 현재 상태가 목표 상태이고 아직 진행 중인 경우
    if (currentStart !== null && this._current === state) {
      totalDuration += new Date() - currentStart;
    }

    return totalDuration;
  }
}