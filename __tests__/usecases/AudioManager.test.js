// __tests__/usecases/AudioManager.test.js
// Red Phase: 실패하는 테스트부터 작성 (TDD)

import { AudioManager } from '../../src/usecases/AudioManager.js';
import { AudioConfig } from '../../src/entities/AudioConfig.js';
import { PLAYBACK_STATES } from '../../src/entities/PlaybackState.js';

describe('AudioManager UseCase', () => {
  let audioManager;
  let mockTTSAdapter;

  beforeEach(() => {
    // Mock TTS Adapter 설정
    mockTTSAdapter = {
      speak: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      isSupported: jest.fn().mockReturnValue(true),
      stopUtterance: jest.fn(),
      getActiveUtterances: jest.fn().mockReturnValue([]),
      on: jest.fn(),
      off: jest.fn()
    };

    // Red: AudioManager 클래스가 구현되지 않았으므로 실패
    audioManager = new AudioManager(mockTTSAdapter);
  });

  describe('초기화 테스트', () => {
    test('AudioManager가 올바르게 초기화되어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(audioManager.getCurrentState()).toBe(PLAYBACK_STATES.IDLE);
      expect(audioManager.getActiveAudios()).toHaveLength(0);
      expect(audioManager.getCurrentConfig()).toBeInstanceOf(AudioConfig);
    });

    test('TTS 어댑터가 지원되지 않으면 오류 발생해야 함', () => {
      // Red: 구현 전이므로 실패
      const unsupportedAdapter = {
        ...mockTTSAdapter,
        isSupported: jest.fn().mockReturnValue(false)
      };

      expect(() => {
        new AudioManager(unsupportedAdapter);
      }).toThrow('TTS is not supported in this browser');
    });
  });

  describe('음성 재생 테스트', () => {
    test('텍스트를 음성으로 재생할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      const text = '안녕하세요';
      const audioId = await audioManager.playText(text);

      expect(audioId).toBeDefined();
      expect(mockTTSAdapter.speak).toHaveBeenCalledWith(text, expect.any(AudioConfig));
      expect(audioManager.getCurrentState()).toBe(PLAYBACK_STATES.PLAYING);
    });

    test('여러 음성 동시 재생을 방지해야 함', async () => {
      // Red: 구현 전이므로 실패
      await audioManager.playText('첫 번째 텍스트');
      
      // 두 번째 텍스트 재생 시도
      const secondAudioId = await audioManager.playText('두 번째 텍스트');

      // 첫 번째 음성이 중지되고 두 번째 음성이 재생되어야 함
      expect(mockTTSAdapter.stop).toHaveBeenCalled();
      expect(mockTTSAdapter.speak).toHaveBeenCalledTimes(2);
      expect(audioManager.getActiveAudios()).toHaveLength(1);
    });

    test('빈 텍스트는 재생하지 않아야 함', async () => {
      // Red: 구현 전이므로 실패
      await expect(audioManager.playText('')).rejects.toThrow('Text cannot be empty');
      await expect(audioManager.playText('   ')).rejects.toThrow('Text cannot be empty');
      
      expect(mockTTSAdapter.speak).not.toHaveBeenCalled();
    });
  });

  describe('음성 제어 테스트', () => {
    test('현재 재생 중인 음성을 중지할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      await audioManager.playText('테스트 텍스트');
      await audioManager.stopCurrent();

      expect(mockTTSAdapter.stop).toHaveBeenCalled();
      expect(audioManager.getCurrentState()).toBe(PLAYBACK_STATES.IDLE);
      expect(audioManager.getActiveAudios()).toHaveLength(0);
    });

    test('모든 음성을 중지할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      await audioManager.playText('테스트 텍스트');
      await audioManager.stopAll();

      expect(mockTTSAdapter.stop).toHaveBeenCalled();
      expect(audioManager.getCurrentState()).toBe(PLAYBACK_STATES.IDLE);
      expect(audioManager.getActiveAudios()).toHaveLength(0);
    });

    test('재생 중인 음성이 없을 때 중지 요청은 무시되어야 함', async () => {
      // Red: 구현 전이므로 실패
      await audioManager.stopCurrent();

      expect(mockTTSAdapter.stop).not.toHaveBeenCalled();
      expect(audioManager.getCurrentState()).toBe(PLAYBACK_STATES.IDLE);
    });
  });

  describe('설정 관리 테스트', () => {
    test('음성 설정을 업데이트할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      const newConfig = new AudioConfig({
        rate: 1.5,
        volume: 0.8
      });

      audioManager.updateConfig(newConfig);
      
      const currentConfig = audioManager.getCurrentConfig();
      expect(currentConfig.rate).toBe(1.5);
      expect(currentConfig.volume).toBe(0.8);
    });

    test('잘못된 설정은 거부되어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(() => {
        audioManager.updateConfig({ rate: 5.0 }); // 유효하지 않은 속도
      }).toThrow();
    });
  });

  describe('이벤트 처리 테스트', () => {
    test('재생 완료 이벤트를 처리해야 함', async () => {
      // Red: 구현 전이므로 실패
      const onComplete = jest.fn();
      audioManager.on('complete', onComplete);

      await audioManager.playText('테스트 텍스트');
      
      // TTS 완료 시뮬레이션
      audioManager.handleTTSComplete();

      expect(onComplete).toHaveBeenCalled();
      expect(audioManager.getCurrentState()).toBe(PLAYBACK_STATES.COMPLETED);
    });

    test('재생 오류 이벤트를 처리해야 함', async () => {
      // Red: 구현 전이므로 실패
      const onError = jest.fn();
      audioManager.on('error', onError);

      mockTTSAdapter.speak.mockRejectedValue(new Error('TTS Error'));
      
      await expect(audioManager.playText('테스트 텍스트')).rejects.toThrow('TTS Error');
      
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(audioManager.getCurrentState()).toBe(PLAYBACK_STATES.ERROR);
    });
  });
});