// __tests__/usecases/PlaybackController.test.js
// Red Phase: 실패하는 테스트부터 작성 (TDD)

import { PlaybackController } from '../../src/usecases/PlaybackController.js';
import { AudioManager } from '../../src/usecases/AudioManager.js';

describe('PlaybackController UseCase', () => {
  let playbackController;
  let mockAudioManager;
  let mockVocabularyEntry;

  beforeEach(() => {
    // Mock AudioManager 설정
    mockAudioManager = {
      playText: jest.fn().mockResolvedValue('audio-id-123'),
      stopCurrent: jest.fn().mockResolvedValue(),
      stopAll: jest.fn().mockResolvedValue(),
      getCurrentState: jest.fn().mockReturnValue('IDLE'),
      on: jest.fn(),
      off: jest.fn()
    };

    // Mock VocabularyEntry 설정
    mockVocabularyEntry = {
      koreanWord: '안녕하세요',
      examples: [
        '안녕하세요, 만나서 반갑습니다.',
        '안녕하세요라고 인사했다.',
        '친구에게 안녕하세요라고 말했다.'
      ]
    };

    // Red: PlaybackController 클래스가 구현되지 않았으므로 실패
    playbackController = new PlaybackController(mockAudioManager);
  });

  describe('초기화 테스트', () => {
    test('PlaybackController가 올바르게 초기화되어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(playbackController.getCurrentlyPlaying()).toBeNull();
      expect(playbackController.getPlayQueue()).toHaveLength(0);
      expect(playbackController.getPlayHistory()).toHaveLength(0);
    });

    test('AudioManager 없이는 초기화할 수 없어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(() => {
        new PlaybackController(null);
      }).toThrow('AudioManager is required');
    });
  });

  describe('개별 예문 재생 테스트', () => {
    test('특정 예문을 재생할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      const exampleIndex = 0;
      const audioId = await playbackController.playExample(mockVocabularyEntry, exampleIndex);

      expect(audioId).toBe('audio-id-123');
      expect(mockAudioManager.playText).toHaveBeenCalledWith(mockVocabularyEntry.examples[0]);
      expect(playbackController.getCurrentlyPlaying()).toEqual({
        entry: mockVocabularyEntry,
        exampleIndex: 0,
        audioId: 'audio-id-123'
      });
    });

    test('잘못된 예문 인덱스는 오류를 발생시켜야 함', async () => {
      // Red: 구현 전이므로 실패
      await expect(
        playbackController.playExample(mockVocabularyEntry, 5)
      ).rejects.toThrow('Example index 5 is out of range');

      await expect(
        playbackController.playExample(mockVocabularyEntry, -1)
      ).rejects.toThrow('Example index -1 is out of range');
    });

    test('단어 자체를 재생할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      const audioId = await playbackController.playWord(mockVocabularyEntry);

      expect(audioId).toBe('audio-id-123');
      expect(mockAudioManager.playText).toHaveBeenCalledWith(mockVocabularyEntry.koreanWord);
      expect(playbackController.getCurrentlyPlaying()).toEqual({
        entry: mockVocabularyEntry,
        exampleIndex: null,
        audioId: 'audio-id-123'
      });
    });
  });

  describe('재생 큐 관리 테스트', () => {
    test('여러 예문을 큐에 추가할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      playbackController.addToQueue(mockVocabularyEntry, 0);
      playbackController.addToQueue(mockVocabularyEntry, 1);
      playbackController.addToQueue(mockVocabularyEntry, 2);

      const queue = playbackController.getPlayQueue();
      expect(queue).toHaveLength(3);
      expect(queue[0]).toEqual({
        entry: mockVocabularyEntry,
        exampleIndex: 0
      });
    });

    test('큐의 다음 항목을 자동으로 재생할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      playbackController.addToQueue(mockVocabularyEntry, 0);
      playbackController.addToQueue(mockVocabularyEntry, 1);

      await playbackController.playNext();

      expect(mockAudioManager.playText).toHaveBeenCalledWith(mockVocabularyEntry.examples[0]);
      expect(playbackController.getPlayQueue()).toHaveLength(1); // 하나 제거됨
    });

    test('빈 큐에서 다음 재생 시도는 무시되어야 함', async () => {
      // Red: 구현 전이므로 실패
      const result = await playbackController.playNext();

      expect(result).toBeNull();
      expect(mockAudioManager.playText).not.toHaveBeenCalled();
    });

    test('큐를 초기화할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      playbackController.addToQueue(mockVocabularyEntry, 0);
      playbackController.addToQueue(mockVocabularyEntry, 1);

      playbackController.clearQueue();

      expect(playbackController.getPlayQueue()).toHaveLength(0);
    });
  });

  describe('재생 히스토리 관리 테스트', () => {
    test('재생된 항목들이 히스토리에 추가되어야 함', async () => {
      // Red: 구현 전이므로 실패
      await playbackController.playExample(mockVocabularyEntry, 0);
      await playbackController.playWord(mockVocabularyEntry);

      const history = playbackController.getPlayHistory();
      expect(history).toHaveLength(2);
      expect(history[0].entry).toBe(mockVocabularyEntry);
      expect(history[0].exampleIndex).toBe(0);
      expect(history[1].exampleIndex).toBeNull(); // 단어 재생
    });

    test('히스토리 크기를 제한할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      playbackController.setMaxHistorySize(2);

      await playbackController.playExample(mockVocabularyEntry, 0);
      await playbackController.playExample(mockVocabularyEntry, 1);
      await playbackController.playExample(mockVocabularyEntry, 2);

      const history = playbackController.getPlayHistory();
      expect(history).toHaveLength(2); // 최대 2개만 유지
      expect(history[0].exampleIndex).toBe(1); // 가장 오래된 것 제거됨
      expect(history[1].exampleIndex).toBe(2);
    });

    test('히스토리를 초기화할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      await playbackController.playExample(mockVocabularyEntry, 0);
      playbackController.clearHistory();

      expect(playbackController.getPlayHistory()).toHaveLength(0);
    });
  });

  describe('재생 제어 테스트', () => {
    test('현재 재생을 중지할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      await playbackController.playExample(mockVocabularyEntry, 0);
      await playbackController.stopCurrent();

      expect(mockAudioManager.stopCurrent).toHaveBeenCalled();
      expect(playbackController.getCurrentlyPlaying()).toBeNull();
    });

    test('모든 재생을 중지할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      await playbackController.playExample(mockVocabularyEntry, 0);
      await playbackController.stopAll();

      expect(mockAudioManager.stopAll).toHaveBeenCalled();
      expect(playbackController.getCurrentlyPlaying()).toBeNull();
      expect(playbackController.getPlayQueue()).toHaveLength(0);
    });
  });

  describe('이벤트 처리 테스트', () => {
    test('재생 완료 시 자동으로 다음 큐 항목을 재생해야 함', async () => {
      // Red: 구현 전이므로 실패
      playbackController.addToQueue(mockVocabularyEntry, 0);
      playbackController.addToQueue(mockVocabularyEntry, 1);

      await playbackController.playNext();
      
      // 재생 완료 이벤트 시뮬레이션
      playbackController.handlePlaybackComplete();

      expect(mockAudioManager.playText).toHaveBeenCalledTimes(2);
      expect(playbackController.getPlayQueue()).toHaveLength(0);
    });

    test('오류 발생 시 큐 재생을 중단해야 함', async () => {
      // Red: 구현 전이므로 실패
      const onError = jest.fn();
      playbackController.on('error', onError);

      playbackController.addToQueue(mockVocabularyEntry, 0);
      mockAudioManager.playText.mockRejectedValue(new Error('Playback failed'));

      await expect(playbackController.playNext()).rejects.toThrow('Playback failed');
      
      expect(onError).toHaveBeenCalled();
      expect(playbackController.getCurrentlyPlaying()).toBeNull();
    });
  });
});