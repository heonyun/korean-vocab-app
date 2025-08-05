// __tests__/entities/AudioConfig.test.js
// Red Phase: 실패하는 테스트부터 작성 (TDD)

import { AudioConfig } from '../../src/entities/AudioConfig.js';

describe('AudioConfig Entity', () => {
  describe('생성자 테스트', () => {
    test('기본 설정으로 AudioConfig를 생성해야 함', () => {
      // Red: 아직 AudioConfig 클래스가 구현되지 않았으므로 실패
      const config = new AudioConfig();
      
      expect(config.language).toBe('ko-KR');
      expect(config.rate).toBe(1.0);
      expect(config.pitch).toBe(1.0);
      expect(config.volume).toBe(1.0);
    });

    test('커스텀 설정으로 AudioConfig를 생성해야 함', () => {
      // Red: 구현 전이므로 실패
      const customConfig = {
        language: 'ko-KR',
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8
      };
      
      const config = new AudioConfig(customConfig);
      
      expect(config.language).toBe('ko-KR');
      expect(config.rate).toBe(1.5);
      expect(config.pitch).toBe(1.2);
      expect(config.volume).toBe(0.8);
    });
  });

  describe('유효성 검사 테스트', () => {
    test('속도(rate)는 0.1-3.0 범위 내에 있어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(() => new AudioConfig({rate: 0.05})).toThrow('Rate must be between 0.1 and 3.0');
      expect(() => new AudioConfig({rate: 3.5})).toThrow('Rate must be between 0.1 and 3.0');
      
      // 유효한 범위는 통과해야 함
      expect(() => new AudioConfig({rate: 0.5})).not.toThrow();
      expect(() => new AudioConfig({rate: 2.0})).not.toThrow();
    });

    test('볼륨은 0.0-1.0 범위 내에 있어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(() => new AudioConfig({volume: -0.1})).toThrow('Volume must be between 0.0 and 1.0');
      expect(() => new AudioConfig({volume: 1.1})).toThrow('Volume must be between 0.0 and 1.0');
      
      // 유효한 범위는 통과해야 함
      expect(() => new AudioConfig({volume: 0.0})).not.toThrow();
      expect(() => new AudioConfig({volume: 1.0})).not.toThrow();
    });
  });

  describe('설정 업데이트 테스트', () => {
    test('속도를 업데이트할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      const config = new AudioConfig();
      config.updateRate(1.5);
      
      expect(config.rate).toBe(1.5);
    });

    test('볼륨을 업데이트할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      const config = new AudioConfig();
      config.updateVolume(0.7);
      
      expect(config.volume).toBe(0.7);
    });
  });
});