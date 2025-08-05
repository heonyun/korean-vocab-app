// jest.setup.js
// Jest 테스트 환경 설정

// Web Speech API Mocks (전역 설정)
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn().mockReturnValue([
    { lang: 'ko-KR', name: 'Korean Voice', default: true },
    { lang: 'en-US', name: 'English Voice', default: false }
  ]),
  speaking: false,
  paused: false,
  pending: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
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
  onboundary: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// 전역 객체에 mocks 설정 - configurable을 true로 설정
Object.defineProperty(global, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true
});

// window 객체에도 같은 mock 설정 (jsdom 환경)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true,
    configurable: true,
    enumerable: true
  });
  
  // in operator가 작동하도록 추가적으로 설정
  window.speechSynthesis = mockSpeechSynthesis;
}

Object.defineProperty(global, 'SpeechSynthesisUtterance', {
  value: mockSpeechSynthesisUtterance,
  writable: true,
  configurable: true
});

// window 객체에도 같은 mock 설정 (jsdom 환경)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: mockSpeechSynthesisUtterance,
    writable: true,
    configurable: true,
    enumerable: true
  });
  
  // in operator가 작동하도록 추가적으로 설정
  window.SpeechSynthesisUtterance = mockSpeechSynthesisUtterance;
}

// Navigator mock
Object.defineProperty(global.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  configurable: true
});

// 각 테스트 전에 mocks 초기화
beforeEach(() => {
  jest.clearAllMocks();
  
  // Speech Synthesis 상태 초기화
  mockSpeechSynthesis.speaking = false;
  mockSpeechSynthesis.paused = false;
  mockSpeechSynthesis.pending = false;
});

// 테스트 완료 후 정리
afterEach(() => {
  jest.restoreAllMocks();
});

// 커스텀 matchers 추가 (필요시)
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// 콘솔 경고 억제 (테스트 환경에서만)
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes && args[0].includes('Web Speech API')) {
    return;
  }
  originalWarn(...args);
};