"""
터미널 서비스 핵심 로직 테스트
"""
import pytest
from app.terminal_service import (
    detect_language,
    LanguageDetectionResult,
    TranslationMode,
    format_terminal_response
)

class TestLanguageDetection:
    """언어 감지 기능 테스트"""
    
    def test_korean_text_detection(self, sample_korean_words):
        """한국어 텍스트 감지 테스트"""
        for word in sample_korean_words["correct"]:
            result = detect_language(word)
            assert result.language == "korean"
            assert result.confidence > 0.8
            assert result.text == word
    
    def test_russian_text_detection(self, sample_russian_words):
        """러시아어 텍스트 감지 테스트"""
        for word in sample_russian_words:
            result = detect_language(word)
            assert result.language == "russian"
            assert result.confidence > 0.8
            assert result.text == word
    
    def test_mixed_language_detection(self):
        """혼합 언어 텍스트 감지 테스트"""
        mixed_text = "안녕 привет hello"
        result = detect_language(mixed_text)
        assert result.language == "mixed"
        assert result.confidence < 0.8
        assert result.text == mixed_text
    
    def test_empty_or_invalid_input(self):
        """빈 입력 또는 무효한 입력 테스트"""
        # 빈 문자열
        result = detect_language("")
        assert result.language == "unknown"
        assert result.confidence == 0.0
        
        # 공백만
        result = detect_language("   ")
        assert result.language == "unknown"
        assert result.confidence == 0.0
        
        # 숫자만
        result = detect_language("12345")
        assert result.language == "unknown"
        assert result.confidence == 0.0
    
    def test_special_characters_and_punctuation(self):
        """특수문자와 구두점 처리 테스트"""
        # 한국어 + 구두점
        result = detect_language("안녕하세요!")
        assert result.language == "korean"
        
        # 러시아어 + 구두점
        result = detect_language("Привет!")
        assert result.language == "russian"
        
        # 구두점만
        result = detect_language("!@#$%")
        assert result.language == "unknown"

class TestTranslationMode:
    """번역 모드 관리 테스트"""
    
    def test_auto_mode_korean_input(self):
        """자동 모드에서 한국어 입력 처리"""
        mode = TranslationMode.AUTO
        text = "사랑해"
        
        result = detect_language(text)
        assert result.should_translate_to == "russian"
    
    def test_auto_mode_russian_input(self):
        """자동 모드에서 러시아어 입력 처리"""
        mode = TranslationMode.AUTO
        text = "любовь"
        
        result = detect_language(text)
        assert result.should_translate_to == "korean"
    
    def test_forced_korean_mode(self):
        """강제 한국어 모드 테스트"""
        mode = TranslationMode.KOREAN_TO_RUSSIAN
        text = "любовь"  # 러시아어 입력이지만 한국어로 취급
        
        result = detect_language(text, forced_mode=mode)
        assert result.forced_language == "korean"
        assert result.should_translate_to == "russian"
    
    def test_forced_russian_mode(self):
        """강제 러시아어 모드 테스트"""
        mode = TranslationMode.RUSSIAN_TO_KOREAN
        text = "사랑해"  # 한국어 입력이지만 러시아어로 취급
        
        result = detect_language(text, forced_mode=mode)
        assert result.forced_language == "russian"
        assert result.should_translate_to == "korean"

class TestTerminalResponseFormatting:
    """터미널 응답 포맷팅 테스트"""
    
    def test_successful_translation_formatting(self):
        """성공적인 번역 결과 포맷팅"""
        translation_data = {
            "original": "사랑해",
            "translation": "Я тебя люблю",
            "pronunciation": "[sa-rang-hae]",
            "examples": [
                {"korean": "정말 사랑해", "russian": "Я действительно тебя люблю"},
                {"korean": "너를 사랑해", "russian": "Я люблю тебя"},
                {"korean": "많이 사랑해", "russian": "Я очень тебя люблю"}
            ]
        }
        
        result = format_terminal_response(translation_data, success=True)
        
        assert "사랑해" in result
        assert "Я тебя люблю" in result
        assert "[sa-rang-hae]" in result
        assert len([line for line in result.split('\n') if "✓" in line]) >= 3  # 3개 예문
    
    def test_error_response_formatting(self):
        """에러 응답 포맷팅"""
        error_message = "번역 서비스에 연결할 수 없습니다"
        
        result = format_terminal_response(None, success=False, error=error_message)
        
        assert "ERROR" in result.upper()
        assert error_message in result
        assert "✗" in result or "❌" in result
    
    def test_command_help_formatting(self):
        """명령어 도움말 포맷팅"""
        result = format_terminal_response(None, command_type="help")
        
        assert "/help" in result
        assert "/clear" in result
        assert "/mode" in result
        assert "사용법:" in result or "Usage:" in result
    
    def test_typing_animation_markers(self):
        """타이핑 애니메이션 마커 테스트"""
        translation_data = {"original": "테스트", "translation": "тест"}
        
        result = format_terminal_response(translation_data, typing_animation=True)
        
        # 타이핑 애니메이션을 위한 특수 마커 확인
        assert "{{TYPING_START}}" in result
        assert "{{TYPING_END}}" in result