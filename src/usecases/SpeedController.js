// src/usecases/SpeedController.js
// SpeedController UseCase - 음성 속도 조절 비즈니스 로직

export class SpeedController {
  constructor(audioManager, options = {}) {
    if (!audioManager) {
      throw new Error('AudioManager is required');
    }

    this._audioManager = audioManager;
    this._minSpeed = options.minSpeed || 0.5;
    this._maxSpeed = options.maxSpeed || 2.0;
    this._step = options.step || 0.1;
    this._defaultSpeed = options.defaultSpeed || 1.0;
    this._eventListeners = new Map();

    // 사전 정의된 속도 설정
    this._presets = {
      slow: 0.75,
      normal: 1.0,
      fast: 1.25,
      veryFast: 1.5
    };
  }

  // Getters
  getCurrentSpeed() {
    return this._audioManager.getCurrentConfig().rate;
  }

  getMinSpeed() {
    return this._minSpeed;
  }

  getMaxSpeed() {
    return this._maxSpeed;
  }

  getSpeedStep() {
    return this._step;
  }

  getSpeedPresets() {
    return { ...this._presets };
  }

  // 속도 설정
  setSpeed(speed) {
    if (typeof speed !== 'number') {
      throw new Error('Speed must be a number');
    }

    if (speed < this._minSpeed) {
      throw new Error(`Speed ${speed} is below minimum speed ${this._minSpeed.toFixed(1)}`);
    }

    if (speed > this._maxSpeed) {
      throw new Error(`Speed ${speed} is above maximum speed ${this._maxSpeed.toFixed(1)}`);
    }

    const oldSpeed = this.getCurrentSpeed();
    
    // 같은 속도로 설정하려는 경우 이벤트 발생하지 않음
    if (Math.abs(oldSpeed - speed) < 0.001) {
      return;
    }

    // AudioManager를 통해 설정 업데이트
    const currentConfig = this._audioManager.getCurrentConfig();
    currentConfig.updateRate(speed);
    this._audioManager.updateConfig(currentConfig);

    // 이벤트 발생
    this._emitEvent('speedChange', {
      oldSpeed,
      newSpeed: speed,
      preset: null
    });
  }

  // 속도 증가
  increaseSpeed() {
    const currentSpeed = this.getCurrentSpeed();
    const newSpeed = Math.min(currentSpeed + this._step, this._maxSpeed);
    
    if (newSpeed > currentSpeed) {
      this.setSpeed(newSpeed);
    }
  }

  // 속도 감소
  decreaseSpeed() {
    const currentSpeed = this.getCurrentSpeed();
    const newSpeed = Math.max(currentSpeed - this._step, this._minSpeed);
    
    if (newSpeed < currentSpeed) {
      this.setSpeed(newSpeed);
    }
  }

  // 사전 정의된 속도로 설정
  setPresetSpeed(presetName) {
    if (!this._presets.hasOwnProperty(presetName)) {
      throw new Error(`Unknown speed preset: ${presetName}`);
    }

    const speed = this._presets[presetName];
    const oldSpeed = this.getCurrentSpeed();

    // 같은 속도로 설정하려는 경우 이벤트 발생하지 않음
    if (Math.abs(oldSpeed - speed) < 0.001) {
      return;
    }

    const currentConfig = this._audioManager.getCurrentConfig();
    currentConfig.updateRate(speed);
    this._audioManager.updateConfig(currentConfig);

    // 이벤트 발생 (프리셋 정보 포함)
    this._emitEvent('speedChange', {
      oldSpeed,
      newSpeed: speed,
      preset: presetName
    });
  }

  // 속도를 기본값으로 리셋
  resetSpeed() {
    this.setSpeed(this._defaultSpeed);
  }

  // 상태 조회 메서드들
  isAtMinSpeed() {
    return Math.abs(this.getCurrentSpeed() - this._minSpeed) < 0.001;
  }

  isAtMaxSpeed() {
    return Math.abs(this.getCurrentSpeed() - this._maxSpeed) < 0.001;
  }

  canIncrease() {
    return this.getCurrentSpeed() < this._maxSpeed - 0.001;
  }

  canDecrease() {
    return this.getCurrentSpeed() > this._minSpeed + 0.001;
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