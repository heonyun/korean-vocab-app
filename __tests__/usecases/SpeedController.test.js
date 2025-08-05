// __tests__/usecases/SpeedController.test.js
// Red Phase: 실패하는 테스트부터 작성 (TDD)

import { SpeedController } from '../../src/usecases/SpeedController.js';
import { AudioConfig } from '../../src/entities/AudioConfig.js';

describe('SpeedController UseCase', () => {
  let speedController;
  let mockAudioManager;
  let mockConfig;

  beforeEach(() => {
    // Mock AudioConfig 설정 - rate를 동적으로 업데이트
    mockConfig = {
      rate: 1.0,
      updateRate: jest.fn().mockImplementation((newRate) => {
        mockConfig.rate = newRate;
      })
    };

    // Mock AudioManager 설정
    mockAudioManager = {
      getCurrentConfig: jest.fn().mockReturnValue(mockConfig),
      updateConfig: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    // Red: SpeedController 클래스가 구현되지 않았으므로 실패
    speedController = new SpeedController(mockAudioManager);
  });

  describe('초기화 테스트', () => {
    test('SpeedController가 올바르게 초기화되어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(speedController.getCurrentSpeed()).toBe(1.0);
      expect(speedController.getMinSpeed()).toBe(0.5);
      expect(speedController.getMaxSpeed()).toBe(2.0);
      expect(speedController.getSpeedStep()).toBe(0.1);
    });

    test('AudioManager 없이는 초기화할 수 없어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(() => {
        new SpeedController(null);
      }).toThrow('AudioManager is required');
    });

    test('커스텀 범위로 초기화할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      const customController = new SpeedController(mockAudioManager, {
        minSpeed: 0.25,
        maxSpeed: 3.0,
        step: 0.25
      });

      expect(customController.getMinSpeed()).toBe(0.25);
      expect(customController.getMaxSpeed()).toBe(3.0);
      expect(customController.getSpeedStep()).toBe(0.25);
    });
  });

  describe('속도 설정 테스트', () => {
    test('유효한 속도로 설정할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      speedController.setSpeed(1.5);

      expect(speedController.getCurrentSpeed()).toBe(1.5);
      expect(mockConfig.updateRate).toHaveBeenCalledWith(1.5);
      expect(mockAudioManager.updateConfig).toHaveBeenCalledWith(mockConfig);
    });

    test('최소 속도 미만으로 설정할 수 없어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(() => {
        speedController.setSpeed(0.3); // 최소 0.5 미만
      }).toThrow('Speed 0.3 is below minimum speed 0.5');
    });

    test('최대 속도 초과로 설정할 수 없어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(() => {
        speedController.setSpeed(2.5); // 최대 2.0 초과
      }).toThrow('Speed 2.5 is above maximum speed 2.0');
    });

    test('잘못된 속도 타입은 오류를 발생시켜야 함', () => {
      // Red: 구현 전이므로 실패
      expect(() => {
        speedController.setSpeed('fast');
      }).toThrow('Speed must be a number');

      expect(() => {
        speedController.setSpeed(null);
      }).toThrow('Speed must be a number');
    });
  });

  describe('속도 증가/감소 테스트', () => {
    test('속도를 단계별로 증가시킬 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      speedController.setSpeed(1.0);
      speedController.increaseSpeed();

      expect(speedController.getCurrentSpeed()).toBe(1.1);
      expect(mockConfig.updateRate).toHaveBeenCalledWith(1.1);
    });

    test('속도를 단계별로 감소시킬 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      speedController.setSpeed(1.0);
      speedController.decreaseSpeed();

      expect(speedController.getCurrentSpeed()).toBe(0.9);
      expect(mockConfig.updateRate).toHaveBeenCalledWith(0.9);
    });

    test('최대 속도에서 더 증가시킬 수 없어야 함', () => {
      // Red: 구현 전이므로 실패
      speedController.setSpeed(2.0);
      speedController.increaseSpeed();

      expect(speedController.getCurrentSpeed()).toBe(2.0); // 변경 없음
      expect(mockConfig.updateRate).toHaveBeenCalledTimes(1); // setSpeed 호출만
    });

    test('최소 속도에서 더 감소시킬 수 없어야 함', () => {
      // Red: 구현 전이므로 실패
      speedController.setSpeed(0.5);
      speedController.decreaseSpeed();

      expect(speedController.getCurrentSpeed()).toBe(0.5); // 변경 없음
      expect(mockConfig.updateRate).toHaveBeenCalledTimes(1); // setSpeed 호출만
    });
  });

  describe('사전 정의된 속도 테스트', () => {
    test('일반적인 속도 설정들을 제공해야 함', () => {
      // Red: 구현 전이므로 실패
      const presets = speedController.getSpeedPresets();

      expect(presets).toEqual({
        slow: 0.75,
        normal: 1.0,
        fast: 1.25,
        veryFast: 1.5
      });
    });

    test('사전 정의된 속도로 설정할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      speedController.setPresetSpeed('fast');

      expect(speedController.getCurrentSpeed()).toBe(1.25);
      expect(mockConfig.updateRate).toHaveBeenCalledWith(1.25);
    });

    test('잘못된 사전 정의 속도는 오류를 발생시켜야 함', () => {
      // Red: 구현 전이므로 실패
      expect(() => {
        speedController.setPresetSpeed('invalid');
      }).toThrow('Unknown speed preset: invalid');
    });
  });

  describe('속도 리셋 테스트', () => {
    test('속도를 기본값으로 리셋할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      speedController.setSpeed(1.8);
      speedController.resetSpeed();

      expect(speedController.getCurrentSpeed()).toBe(1.0);
      expect(mockConfig.updateRate).toHaveBeenCalledWith(1.0);
    });

    test('커스텀 기본값으로 리셋할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      const customController = new SpeedController(mockAudioManager, {
        defaultSpeed: 1.2
      });

      customController.setSpeed(1.8);
      customController.resetSpeed();

      expect(customController.getCurrentSpeed()).toBe(1.2);
    });
  });

  describe('속도 상태 조회 테스트', () => {
    test('현재 속도가 최소/최대 범위인지 확인할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      speedController.setSpeed(0.5);
      expect(speedController.isAtMinSpeed()).toBe(true);
      expect(speedController.isAtMaxSpeed()).toBe(false);

      speedController.setSpeed(2.0);
      expect(speedController.isAtMinSpeed()).toBe(false);
      expect(speedController.isAtMaxSpeed()).toBe(true);

      speedController.setSpeed(1.0);
      expect(speedController.isAtMinSpeed()).toBe(false);
      expect(speedController.isAtMaxSpeed()).toBe(false);
    });

    test('속도 증가/감소 가능 여부를 확인할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      speedController.setSpeed(0.5);
      expect(speedController.canIncrease()).toBe(true);
      expect(speedController.canDecrease()).toBe(false);

      speedController.setSpeed(2.0);
      expect(speedController.canIncrease()).toBe(false);
      expect(speedController.canDecrease()).toBe(true);

      speedController.setSpeed(1.0);
      expect(speedController.canIncrease()).toBe(true);
      expect(speedController.canDecrease()).toBe(true);
    });
  });

  describe('이벤트 처리 테스트', () => {
    test('속도 변경 시 이벤트를 발생시켜야 함', () => {
      // Red: 구현 전이므로 실패
      const onSpeedChange = jest.fn();
      speedController.on('speedChange', onSpeedChange);

      speedController.setSpeed(1.5);

      expect(onSpeedChange).toHaveBeenCalledWith({
        oldSpeed: 1.0,
        newSpeed: 1.5,
        preset: null
      });
    });

    test('사전 정의 속도 설정 시 프리셋 정보를 포함해야 함', () => {
      // Red: 구현 전이므로 실패
      const onSpeedChange = jest.fn();
      speedController.on('speedChange', onSpeedChange);

      speedController.setPresetSpeed('fast');

      expect(onSpeedChange).toHaveBeenCalledWith({
        oldSpeed: 1.0,
        newSpeed: 1.25,
        preset: 'fast'
      });
    });

    test('같은 속도로 설정할 때는 이벤트를 발생시키지 않아야 함', () => {
      // Red: 구현 전이므로 실패
      const onSpeedChange = jest.fn();
      speedController.on('speedChange', onSpeedChange);

      speedController.setSpeed(1.0); // 현재와 같은 속도

      expect(onSpeedChange).not.toHaveBeenCalled();
    });
  });
});