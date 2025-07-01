"""
터미널 인터페이스를 위한 핵심 서비스 로직
"""
import re
import enum
from typing import Optional, Dict, List, Any
from pydantic import BaseModel
from .ai_service import generate_vocabulary_entry


class TranslationMode(enum.Enum):
    """번역 모드 열거형"""
    AUTO = "auto"
    KOREAN_TO_RUSSIAN = "korean"
    RUSSIAN_TO_KOREAN = "russian"


class LanguageDetectionResult(BaseModel):
    """언어 감지 결과"""
    language: str  # korean, russian, mixed, unknown
    confidence: float  # 0.0 ~ 1.0
    text: str
    should_translate_to: Optional[str] = None
    forced_language: Optional[str] = None


def detect_language(text: str, forced_mode: Optional[TranslationMode] = None) -> LanguageDetectionResult:
    """
    입력 텍스트의 언어를 감지합니다.
    
    Args:
        text: 분석할 텍스트
        forced_mode: 강제 번역 모드 (선택사항)
    
    Returns:
        LanguageDetectionResult: 언어 감지 결과
    """
    # 입력 텍스트 정리
    cleaned_text = text.strip()
    
    # 빈 입력 처리
    if not cleaned_text:
        return LanguageDetectionResult(
            language="unknown",
            confidence=0.0,
            text=text
        )
    
    # 강제 모드 처리
    if forced_mode:
        if forced_mode == TranslationMode.KOREAN_TO_RUSSIAN:
            return LanguageDetectionResult(
                language="korean",
                confidence=1.0,
                text=text,
                forced_language="korean",
                should_translate_to="russian"
            )
        elif forced_mode == TranslationMode.RUSSIAN_TO_KOREAN:
            return LanguageDetectionResult(
                language="russian",
                confidence=1.0,
                text=text,
                forced_language="russian",
                should_translate_to="korean"
            )
    
    # 정규식 패턴 정의
    korean_pattern = re.compile(r'[가-힣ㄱ-ㅎㅏ-ㅣ]')
    russian_pattern = re.compile(r'[а-яёА-ЯЁ]')
    
    # 문자 분석
    korean_chars = len(korean_pattern.findall(cleaned_text))
    russian_chars = len(russian_pattern.findall(cleaned_text))
    total_chars = len(re.sub(r'[^\w]', '', cleaned_text))  # 문자와 숫자만
    
    # 유효한 문자가 없는 경우
    if total_chars == 0:
        return LanguageDetectionResult(
            language="unknown",
            confidence=0.0,
            text=text
        )
    
    # 신뢰도 계산
    korean_ratio = korean_chars / total_chars if total_chars > 0 else 0
    russian_ratio = russian_chars / total_chars if total_chars > 0 else 0
    
    # 언어 결정
    if korean_ratio > 0.7:
        return LanguageDetectionResult(
            language="korean",
            confidence=korean_ratio,
            text=text,
            should_translate_to="russian"
        )
    elif russian_ratio > 0.7:
        return LanguageDetectionResult(
            language="russian",
            confidence=russian_ratio,
            text=text,
            should_translate_to="korean"
        )
    elif korean_ratio > 0 and russian_ratio > 0:
        return LanguageDetectionResult(
            language="mixed",
            confidence=max(korean_ratio, russian_ratio),
            text=text
        )
    else:
        return LanguageDetectionResult(
            language="unknown",
            confidence=0.0,
            text=text
        )


def format_terminal_response(
    data: Optional[Dict[str, Any]], 
    success: bool = True, 
    error: Optional[str] = None,
    command_type: Optional[str] = None,
    typing_animation: bool = False,
    mode: Optional[str] = None
) -> str:
    """
    터미널 스타일로 응답을 포맷팅합니다.
    
    Args:
        data: 번역 데이터
        success: 성공 여부
        error: 에러 메시지 (실패시)
        command_type: 명령어 타입 (help, clear 등)
        typing_animation: 타이핑 애니메이션 사용 여부
    
    Returns:
        str: 포맷팅된 터미널 응답
    """
    # 타이핑 애니메이션 마커
    typing_start = "{{TYPING_START}}" if typing_animation else ""
    typing_end = "{{TYPING_END}}" if typing_animation else ""
    
    # 명령어 도움말
    if command_type == "help":
        return f"""{typing_start}
╭─────────────────────────────────────────────────────╮
│                    터미널 명령어                      │
├─────────────────────────────────────────────────────┤
│ /help          - 이 도움말 표시                      │
│ /clear         - 채팅 기록 삭제                      │
│ /mode korean   - 한국어 → 러시아어 모드             │
│ /mode russian  - 러시아어 → 한국어 모드             │
│ /mode auto     - 자동 언어 감지 모드                 │
├─────────────────────────────────────────────────────┤
│ 사용법: 메시지를 입력하면 자동으로 번역됩니다        │
╰─────────────────────────────────────────────────────╯{typing_end}"""
    
    # 화면 지우기
    if command_type == "clear":
        return f"{typing_start}{{{{CLEAR_SCREEN}}}}{typing_end}"
    
    # 모드 변경 확인
    if command_type == "mode_change" and mode:
        mode_names = {
            "korean": "한국어 → 러시아어 (korean)",
            "russian": "러시아어 → 한국어 (russian)", 
            "auto": "자동 언어 감지 (auto)"
        }
        mode_name = mode_names.get(mode, mode)
        return f"""{typing_start}
╭─ 모드 변경 ─────────────────────────────────────────╮
│ ✅ {mode_name} 모드로 변경되었습니다
╰─────────────────────────────────────────────────────╯{typing_end}"""
    
    # 에러 응답
    if not success or error:
        return f"""{typing_start}
╭─ ERROR ─────────────────────────────────────────────╮
│ ❌ {error or '알 수 없는 오류가 발생했습니다'}
╰─────────────────────────────────────────────────────╯{typing_end}"""
    
    # 번역 응답
    if data:
        original = data.get("original", "")
        translation = data.get("translation", "")
        pronunciation = data.get("pronunciation", "")
        examples = data.get("examples", [])
        
        result = f"""{typing_start}
╭─ 번역 결과 ─────────────────────────────────────────╮
│ 📝 원문: {original}
│ 🔄 번역: {translation}"""
        
        if pronunciation:
            result += f"\n│ 🔊 발음: {pronunciation}"
        
        result += "\n├─ 활용 예제 ─────────────────────────────────────────┤"
        
        for i, example in enumerate(examples[:3], 1):
            korean = example.get("korean", "")
            russian = example.get("russian", "")
            result += f"\n│ ✓ {i}. {korean}"
            result += f"\n│    → {russian}"
        
        result += f"\n╰─────────────────────────────────────────────────────╯{typing_end}"
        
        return result
    
    return f"{typing_start}응답 데이터가 없습니다.{typing_end}"


async def process_terminal_translation(text: str, mode: TranslationMode = TranslationMode.AUTO) -> Dict[str, Any]:
    """
    터미널 입력을 처리하여 번역 결과를 반환합니다.
    
    Args:
        text: 번역할 텍스트
        mode: 번역 모드
    
    Returns:
        Dict[str, Any]: 번역 결과 데이터
    """
    try:
        # 언어 감지
        detection_result = detect_language(text, forced_mode=mode)
        
        # 알 수 없는 언어이거나 혼합 언어인 경우
        if detection_result.language in ["unknown", "mixed"]:
            return {
                "success": False,
                "error": "지원되지 않는 언어이거나 혼합된 언어입니다. 한국어 또는 러시아어로 입력해주세요."
            }
        
        # 기존 AI 서비스 활용하여 번역
        vocabulary_entry = await generate_vocabulary_entry(text)
        
        # 터미널 형식으로 데이터 변환
        examples = []
        for example in vocabulary_entry.usage_examples:
            examples.append({
                "korean": example.korean_sentence,
                "russian": example.russian_translation
            })
        
        return {
            "success": True,
            "original": vocabulary_entry.original_word,
            "translation": vocabulary_entry.russian_translation,
            "pronunciation": vocabulary_entry.pronunciation,
            "examples": examples
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"번역 중 오류가 발생했습니다: {str(e)}"
        }


def parse_terminal_command(text: str) -> Optional[Dict[str, Any]]:
    """
    터미널 명령어를 파싱합니다.
    
    Args:
        text: 입력 텍스트
    
    Returns:
        Optional[Dict[str, Any]]: 파싱된 명령어 정보 또는 None
    """
    # 입력 텍스트 정리
    clean_text = text.strip()
    
    # 명령어가 아닌 경우
    if not clean_text.startswith('/'):
        return None
    
    # 길이 제한 확인 (100자 초과)
    if len(clean_text) > 100:
        return {"type": "invalid", "error": "명령어가 너무 깁니다"}
    
    # 명령어 파싱
    parts = clean_text.split()
    command = parts[0]
    args = parts[1:] if len(parts) > 1 else []
    
    # 특수문자 확인 (슬래시와 알파벳, 숫자, 공백 외)
    if not re.match(r'^/[a-z]+(\s+[a-z]+)*$', clean_text):
        return {"type": "invalid", "error": "명령어에 허용되지 않는 문자가 포함되어 있습니다"}
    
    # 지원되는 명령어 확인
    if command == "/help":
        # help 명령어는 추가 인자 허용하지 않음
        if args:
            return {"type": "invalid", "error": "/help 명령어는 추가 인자를 받지 않습니다"}
        return {"type": "help", "args": args}
    elif command == "/clear":
        if args:
            return {"type": "invalid", "error": "/clear 명령어는 추가 인자를 받지 않습니다"}
        return {"type": "clear", "args": args}
    elif command == "/mode":
        if len(args) != 1:
            return {"type": "invalid", "error": "/mode 명령어는 정확히 하나의 인자가 필요합니다"}
        if args[0] not in ["korean", "russian", "auto"]:
            return {"type": "invalid", "error": "올바른 모드를 입력해주세요: korean, russian, auto"}
        return {"type": "mode", "mode": args[0], "args": args}
    elif command in ["/history", "/stats"]:
        # 향후 구현 예정인 명령어들
        return {"type": "invalid", "error": f"{command} 명령어는 아직 구현되지 않았습니다"}
    else:
        return {"type": "invalid", "error": f"알 수 없는 명령어: {command}"}