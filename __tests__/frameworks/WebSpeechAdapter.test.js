// __tests__/frameworks/WebSpeechAdapter.test.js
// Red Phase: 실패하는 테스트부터 작성 (TDD)

import { WebSpeechAdapter } from '../../src/frameworks/WebSpeechAdapter.js';
import { AudioConfig } from '../../src/entities/AudioConfig.js';

// Web Speech API Mocks
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn().mockReturnValue([]),
  speaking: false,
  paused: false,
  pending: false
};

const mockSpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  lang: 'ko-KR',
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null,
  onmark: null,
  onboundary: null
}));

// Global mocks
global.speechSynthesis = mockSpeechSynthesis;
global.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance;

describe('WebSpeechAdapter Framework', () => {
  let webSpeechAdapter;
  let mockConfig;

  beforeEach(() => {
    // 각 테스트 전에 mocks 초기화
    jest.clearAllMocks();
    
    mockConfig = new AudioConfig({
      language: 'ko-KR',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    });

    // Red: WebSpeechAdapter 클래스가 구현되지 않았으므로 실패
    webSpeechAdapter = new WebSpeechAdapter();
  });

  describe('브라우저 지원 테스트', () => {
    test('Web Speech API 지원 여부를 확인할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      expect(webSpeechAdapter.isSupported()).toBe(true);
    });

    test('Web Speech API가 지원되지 않는 경우를 처리해야 함', () => {
      // Red: 구현 전이므로 실패
      const originalSpeechSynthesis = global.speechSynthesis;
      delete global.speechSynthesis;

      const adapter = new WebSpeechAdapter();
      expect(adapter.isSupported()).toBe(false);

      global.speechSynthesis = originalSpeechSynthesis;
    });

    test('지원되는 언어 목록을 가져올 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      const mockVoices = [
        { lang: 'ko-KR', name: 'Korean Voice', default: true },
        { lang: 'en-US', name: 'English Voice', default: false }
      ];
      mockSpeechSynthesis.getVoices.mockReturnValue(mockVoices);

      const supportedLanguages = webSpeechAdapter.getSupportedLanguages();
      
      expect(supportedLanguages).toContain('ko-KR');
      expect(supportedLanguages).toContain('en-US');
    });
  });

  describe('음성 재생 테스트', () => {
    test('텍스트를 음성으로 재생할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      const text = '안녕하세요';
      const utteranceId = await webSpeechAdapter.speak(text, mockConfig);

      expect(utteranceId).toBeDefined();
      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith(text);
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    test('AudioConfig 설정이 올바르게 적용되어야 함', async () => {
      // Red: 구현 전이므로 실패
      const text = '테스트 텍스트';
      const config = new AudioConfig({
        language: 'ko-KR',
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8
      });

      await webSpeechAdapter.speak(text, config);

      const utteranceCall = mockSpeechSynthesisUtterance.mock.calls[0];
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      
      expect(utterance.lang).toBe('ko-KR');
      expect(utterance.rate).toBe(1.5);
      expect(utterance.pitch).toBe(1.2);
      expect(utterance.volume).toBe(0.8);
    });

    test('빈 텍스트는 재생하지 않아야 함', async () => {
      // Red: 구현 전이므로 실패
      await expect(webSpeechAdapter.speak('', mockConfig)).rejects.toThrow('Text cannot be empty');
      await expect(webSpeechAdapter.speak('   ', mockConfig)).rejects.toThrow('Text cannot be empty');
      
      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    test('잘못된 설정은 기본값을 사용해야 함', async () => {
      // Red: 구현 전이므로 실패
      const text = '테스트';
      await webSpeechAdapter.speak(text, null);

      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      expect(utterance.lang).toBe('ko-KR'); // 기본값
      expect(utterance.rate).toBe(1.0); // 기본값
    });
  });

  describe('음성 제어 테스트', () => {
    test('현재 재생 중인 음성을 중지할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      webSpeechAdapter.stop();
      
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    test('음성 재생을 일시정지할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      webSpeechAdapter.pause();
      
      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    });

    test('일시정지된 음성을 재개할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      webSpeechAdapter.resume();
      
      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
    });

    test('특정 utterance를 중지할 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      const utteranceId = await webSpeechAdapter.speak('테스트', mockConfig);
      webSpeechAdapter.stopUtterance(utteranceId);
      
      // 특정 utterance가 중지되었는지 확인하는 로직 필요
      expect(webSpeechAdapter.isUtterancePlaying(utteranceId)).toBe(false);
    });
  });

  describe('상태 조회 테스트', () => {
    test('현재 재생 상태를 확인할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      mockSpeechSynthesis.speaking = true;
      expect(webSpeechAdapter.isSpeaking()).toBe(true);

      mockSpeechSynthesis.speaking = false;
      expect(webSpeechAdapter.isSpeaking()).toBe(false);
    });

    test('일시정지 상태를 확인할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      mockSpeechSynthesis.paused = true;
      expect(webSpeechAdapter.isPaused()).toBe(true);

      mockSpeechSynthesis.paused = false;
      expect(webSpeechAdapter.isPaused()).toBe(false);
    });

    test('대기 중인 utterance가 있는지 확인할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      mockSpeechSynthesis.pending = true;
      expect(webSpeechAdapter.isPending()).toBe(true);

      mockSpeechSynthesis.pending = false;
      expect(webSpeechAdapter.isPending()).toBe(false);
    });

    test('활성 utterance 목록을 가져올 수 있어야 함', async () => {
      // Red: 구현 전이므로 실패
      const id1 = await webSpeechAdapter.speak('첫 번째', mockConfig);
      const id2 = await webSpeechAdapter.speak('두 번째', mockConfig);

      const activeUtterances = webSpeechAdapter.getActiveUtterances();
      expect(activeUtterances).toContain(id1);
      expect(activeUtterances).toContain(id2);
    });
  });

  describe('이벤트 처리 테스트', () => {
    test('재생 시작 이벤트를 처리해야 함', async () => {
      // Red: 구현 전이므로 실패
      const onStart = jest.fn();
      webSpeechAdapter.on('start', onStart);

      const utteranceId = await webSpeechAdapter.speak('테스트', mockConfig);
      
      // 이벤트 핸들러가 utterance에 등록되었는지 확인
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      expect(utterance.onstart).toBeDefined();
      
      // 이벤트 시뮬레이션
      utterance.onstart();
      expect(onStart).toHaveBeenCalledWith({ utteranceId, text: '테스트' });
    });

    test('재생 완료 이벤트를 처리해야 함', async () => {
      // Red: 구현 전이므로 실패
      const onEnd = jest.fn();
      webSpeechAdapter.on('end', onEnd);

      const utteranceId = await webSpeechAdapter.speak('테스트', mockConfig);
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;

      // 이벤트 시뮬레이션
      utterance.onend();
      expect(onEnd).toHaveBeenCalledWith({ utteranceId, text: '테스트' });
    });

    test('재생 오류 이벤트를 처리해야 함', async () => {
      // Red: 구현 전이므로 실패
      const onError = jest.fn();
      webSpeechAdapter.on('error', onError);

      const utteranceId = await webSpeechAdapter.speak('테스트', mockConfig);
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;

      // 오류 이벤트 시뮬레이션
      const errorEvent = { error: 'network' };
      utterance.onerror(errorEvent);
      
      expect(onError).toHaveBeenCalledWith({ 
        utteranceId, 
        text: '테스트', 
        error: errorEvent 
      });
    });

    test('일시정지/재개 이벤트를 처리해야 함', async () => {
      // Red: 구현 전이므로 실패
      const onPause = jest.fn();
      const onResume = jest.fn();
      
      webSpeechAdapter.on('pause', onPause);
      webSpeechAdapter.on('resume', onResume);

      const utteranceId = await webSpeechAdapter.speak('테스트', mockConfig);
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;

      // 이벤트 시뮬레이션
      utterance.onpause();
      utterance.onresume();

      expect(onPause).toHaveBeenCalled();
      expect(onResume).toHaveBeenCalled();
    });
  });

  describe('브라우저별 호환성 테스트', () => {
    test('Chrome에서의 특별한 처리를 해야 함', () => {
      // Red: 구현 전이므로 실패
      // Chrome에서는 voices가 비동기로 로드됨
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      });

      const adapter = new WebSpeechAdapter();
      expect(adapter.requiresVoiceLoading()).toBe(true);
    });

    test('Safari에서의 특별한 처리를 해야 함', () => {
      // Red: 구현 전이므로 실패
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        configurable: true
      });

      const adapter = new WebSpeechAdapter();
      expect(adapter.requiresUserInteraction()).toBe(true);
    });

    test('지원되지 않는 브라우저에서 적절한 오류를 발생시켜야 함', () => {
      // Red: 구현 전이므로 실패
      const originalSpeechSynthesis = global.speechSynthesis;
      delete global.speechSynthesis;

      expect(() => {
        const adapter = new WebSpeechAdapter();
        adapter.speak('테스트', mockConfig);
      }).rejects.toThrow('Web Speech API is not supported in this browser');

      global.speechSynthesis = originalSpeechSynthesis;
    });
  });

  describe('메모리 관리 테스트', () => {
    test('완료된 utterance는 자동으로 정리되어야 함', async () => {
      // Red: 구현 전이므로 실패
      const utteranceId = await webSpeechAdapter.speak('테스트', mockConfig);
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;

      expect(webSpeechAdapter.getActiveUtterances()).toContain(utteranceId);

      // 완료 이벤트 시뮬레이션
      utterance.onend();

      expect(webSpeechAdapter.getActiveUtterances()).not.toContain(utteranceId);
    });

    test('최대 동시 utterance 수를 제한해야 함', async () => {
      // Red: 구현 전이므로 실패
      const maxConcurrent = 5;
      
      // 최대 개수만큼 utterance 생성
      const promises = Array.from({ length: maxConcurrent + 2 }, (_, i) => 
        webSpeechAdapter.speak(`테스트 ${i}`, mockConfig)
      );

      await Promise.all(promises);

      expect(webSpeechAdapter.getActiveUtterances()).toHaveLength(maxConcurrent);
    });
  });
});