// src/entities/AudioConfig.js
// AudioConfig Entity - 음성 설정을 관리하는 핵심 비즈니스 객체

export class AudioConfig {
  constructor(config = {}) {
    // 기본값 설정
    this._language = config.language || 'ko-KR';
    this._rate = config.rate || 1.0;
    this._pitch = config.pitch || 1.0;
    this._volume = config.volume || 1.0;

    // 설정 유효성 검사
    this._validateConfig();
  }

  // Getters
  get language() {
    return this._language;
  }

  get rate() {
    return this._rate;
  }

  get pitch() {
    return this._pitch;
  }

  get volume() {
    return this._volume;
  }

  // 속도 업데이트
  updateRate(rate) {
    if (typeof rate !== 'number') {
      throw new Error('Rate must be a number');
    }
    if (rate < 0.1 || rate > 3.0) {
      throw new Error('Rate must be between 0.1 and 3.0');
    }
    this._rate = rate;
  }

  // 볼륨 업데이트
  updateVolume(volume) {
    if (typeof volume !== 'number') {
      throw new Error('Volume must be a number');
    }
    if (volume < 0.0 || volume > 1.0) {
      throw new Error('Volume must be between 0.0 and 1.0');
    }
    this._volume = volume;
  }

  // 피치 업데이트
  updatePitch(pitch) {
    if (typeof pitch !== 'number') {
      throw new Error('Pitch must be a number');
    }
    if (pitch < 0.0 || pitch > 2.0) {
      throw new Error('Pitch must be between 0.0 and 2.0');
    }
    this._pitch = pitch;
  }

  // 언어 업데이트
  updateLanguage(language) {
    if (typeof language !== 'string' || !language.trim()) {
      throw new Error('Language must be a non-empty string');
    }
    this._language = language.trim();
  }

  // 설정 복사본 생성
  clone() {
    return new AudioConfig({
      language: this._language,
      rate: this._rate,
      pitch: this._pitch,
      volume: this._volume
    });
  }

  // 설정을 플레인 객체로 변환
  toJSON() {
    return {
      language: this._language,
      rate: this._rate,
      pitch: this._pitch,
      volume: this._volume
    };
  }

  // 플레인 객체에서 AudioConfig 생성
  static fromJSON(json) {
    return new AudioConfig(json);
  }

  // 설정 유효성 검사
  _validateConfig() {
    this.updateRate(this._rate);
    this.updatePitch(this._pitch);
    this.updateVolume(this._volume);
    this.updateLanguage(this._language);
  }

  // 두 설정이 같은지 비교
  equals(other) {
    if (!(other instanceof AudioConfig)) {
      return false;
    }

    return (
      this._language === other._language &&
      Math.abs(this._rate - other._rate) < 0.001 &&
      Math.abs(this._pitch - other._pitch) < 0.001 &&
      Math.abs(this._volume - other._volume) < 0.001
    );
  }

  // 설정 설명 문자열 생성
  toString() {
    return `AudioConfig(lang=${this._language}, rate=${this._rate}, pitch=${this._pitch}, volume=${this._volume})`;
  }
}