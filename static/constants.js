// 상수 정의 - Magic String 제거
export const STORAGE_KEYS = {
    VOCABULARY_DATA: 'vocabulary_data',
    THEME: 'theme',
    TTS_PLAYBACK_RATE: 'tts-playback-rate'
};

export const API_ENDPOINTS = {
    GENERATE_VOCABULARY: '/api/generate-vocabulary',
    VOCABULARY: '/api/vocabulary'
};

export const VALIDATION = {
    // 한국어 문자 검증 (한글, 숫자, 기본 문장부호)
    KOREAN_REGEX: /^[가-힣0-9\s.,!?~\-()]+$/,
    MIN_WORD_LENGTH: 1,
    MAX_WORD_LENGTH: 50,
    MAX_SENTENCE_LENGTH: 200
};

export const UI_CONSTANTS = {
    NOTIFICATION_DURATION: 3000, // 3초
    LOADING_DELAY: 500, // 0.5초
    MAX_RECENT_WORDS: 5
};

export const ERROR_MESSAGES = {
    EMPTY_INPUT: '한국어 단어를 입력해주세요!',
    INVALID_KOREAN: '한국어 문자만 입력 가능합니다.',
    TOO_SHORT: `최소 ${VALIDATION.MIN_WORD_LENGTH}글자 이상 입력해주세요.`,
    TOO_LONG: `최대 ${VALIDATION.MAX_WORD_LENGTH}글자까지 입력 가능합니다.`,
    NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
    SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    GENERATION_FAILED: '어휘 생성에 실패했습니다.',
    SAVE_FAILED: '저장에 실패했습니다.',
    DELETE_FAILED: '삭제에 실패했습니다.',
    LOAD_FAILED: '데이터를 불러올 수 없습니다.'
};

export const SUCCESS_MESSAGES = {
    VOCABULARY_GENERATED: '✅ 어휘가 성공적으로 생성되었습니다!',
    VOCABULARY_SAVED: '✅ 어휘가 노트에 저장되었습니다!',
    VOCABULARY_DELETED: '✅ 단어가 삭제되었습니다.',
    THEME_CHANGED: '테마가 변경되었습니다.',
    NETWORK_RESTORED: '🌐 인터넷에 연결되었습니다'
};