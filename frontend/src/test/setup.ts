import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Web Speech API
class MockSpeechSynthesisUtterance {
  text = ''
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  voice = null
  
  constructor(text?: string) {
    if (text) this.text = text
  }
}

const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [
    { lang: 'ko-KR', name: 'Korean Voice' }
  ]),
  addEventListener: vi.fn()
}

// @ts-ignore
global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance
// @ts-ignore
global.speechSynthesis = mockSpeechSynthesis

