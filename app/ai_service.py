import os
import json
import re
from typing import List
import google.generativeai as genai
from pydantic_ai import Agent
from .models import VocabularyEntry, UsageExample, SpellCheckInfo

# 환경변수 로드 (python-dotenv 사용)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv가 없으면 환경변수 직접 사용
    pass

# Gemini API 설정
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# 언어 감지 함수
def detect_language(text: str) -> str:
    """입력 텍스트의 언어를 감지합니다."""
    # 키릴 문자 패턴 (러시아어)
    cyrillic_pattern = re.compile(r'[\u0400-\u04FF]')
    # 한글 패턴
    hangul_pattern = re.compile(r'[가-힣]')
    
    if cyrillic_pattern.search(text):
        return "russian"
    elif hangul_pattern.search(text):
        return "korean"
    else:
        # 기본적으로 한국어로 처리 (영어/숫자 등)
        return "korean"

# PydanticAI Agent 설정 (API 키가 있을 때만)
vocabulary_agent = None
if GOOGLE_API_KEY:
    try:
        vocabulary_agent = Agent(
            'gemini-2.5-flash',
            result_type=VocabularyEntry,
            system_prompt="""당신은 러시아인과 한국인이 서로의 언어를 배우는 것을 도와주는 전문 언어 교사입니다.

🔄 양방향 번역 지원:
- 한국어 입력 → 러시아어 번역 + 한국어 발음
- 러시아어 입력 → 한국어 번역 + 한국어 발음

⚠️ 중요: 입력 언어에 따라 적절히 처리하세요.

📝 한국어 입력인 경우:
1. 맞춤법 검증 (원본 단어, 수정된 단어, 오류 여부)
2. 러시아어 번역 (수정된 단어 기준)
3. 한국어 발음 표기 (로마자)
4. 연인 관계에서 사용할 수 있는 3개의 활용 예제

🔤 러시아어 입력인 경우:
1. 맞춤법은 체크하지 않음 (has_spelling_error: false)
2. 한국어 번역 (가장 자연스러운 표현)
3. 한국어 발음 표기 (로마자)
4. 연인 관계에서 사용할 수 있는 3개의 활용 예제

각 활용 예제는:
- 기본형 + 수식어 조합
- 문법 변화형 (과거/현재/미래, 높임말/반말)
- 상황별 활용 (전화, 메시지, 대면 대화)

각 예제마다 번역과 문법 설명(한국어와 러시아어 둘 다), 사용 상황(한국어와 러시아어 둘 다)을 포함해주세요.
모든 응답은 연인 관계의 자연스러운 대화 맥락에서 사용 가능해야 합니다.

⭐ 중요: context_russian 필드를 반드시 포함해서 상황 설명의 러시아어 번역을 제공해주세요."""
        )
    except Exception as e:
        print(f"⚠️  PydanticAI 에이전트 초기화 실패: {e}")
        vocabulary_agent = None

async def generate_vocabulary_entry(input_text: str) -> VocabularyEntry:
    """입력 텍스트(한국어/러시아어)를 감지하여 적절한 번역 데이터를 생성합니다."""
    if not vocabulary_agent:
        # API 키가 없으면 백업 함수 사용
        return await generate_vocabulary_fallback(input_text)
    
    # 언어 감지
    detected_language = detect_language(input_text)
    
    try:
        if detected_language == "russian":
            # 러시아어 → 한국어 번역
            prompt = f"""
            러시아어 단어/표현: "{input_text}"
            
            다음 순서로 처리해주세요:
            1단계: 러시아어 입력 처리 (맞춤법 검사는 생략)
            2단계: 한국어 번역 데이터 생성
            - 가장 자연스러운 한국어 번역
            - 한국어 발음 표기 (로마자)
            - 연인 관계에서 사용할 수 있는 3개 활용 예제 (한국어)

            응답 형식:
            {{
                "spelling_check": {{
                    "original_word": "{input_text}",
                    "corrected_word": "{input_text}",
                    "has_spelling_error": false,
                    "correction_note": null
                }},
                "original_word": "한국어_번역",
                "russian_translation": "{input_text}",
                "pronunciation": "[han-guk-eo-bal-eum]",
                "usage_examples": [
                    {{
                        "korean_sentence": "한국어_예문1",
                        "russian_translation": "러시아어_번역1",
                        "grammar_note": "한국어_문법_설명1",
                        "grammar_note_russian": "русское_объяснение_1",
                        "context": "한국어_상황설명1",
                        "context_russian": "ситуация_использования_1"
                    }},
                    ... 총 3개 예제
                ]
            }}
            """
        else:
            # 한국어 → 러시아어 번역 (기존 로직)
            prompt = f"""
            한국어 단어/표현: "{input_text}"

            다음 순서로 처리해주세요:
            1단계: 맞춤법 검증
            - 입력된 단어의 맞춤법이 올바른지 확인
            - 틀린 경우 올바른 맞춤법 제시 및 설명

            2단계: 어휘 학습 데이터 생성 (올바른 맞춤법 기준)
            - 러시아어 번역
            - 한국어 발음 표기 (로마자)
            - 연인 관계에서 사용할 수 있는 3개 활용 예제

            응답 형식:
            {{
                "spelling_check": {{
                    "original_word": "{input_text}",
                    "corrected_word": "올바른_맞춤법",
                    "has_spelling_error": true/false,
                    "correction_note": "맞춤법 설명 (필요시)"
                }},
            "original_word": "올바른_맞춤법",
            "russian_translation": "러시아어_번역",
            "pronunciation": "[발음_표기]",
            "usage_examples": [
                {{
                    "korean_sentence": "예문1",
                    "russian_translation": "러시아어_번역1",
                    "grammar_note": "문법_설명1",
                    "grammar_note_russian": "грамматическое_объяснение_1",
                    "context": "사용_상황1",
                    "context_russian": "ситуация_использования_1"
                }},
                {{
                    "korean_sentence": "예문2",
                    "russian_translation": "러시아어_번역2",
                    "grammar_note": "문법_설명2",
                    "grammar_note_russian": "грамматическое_объяснение_2",
                    "context": "사용_상황2",
                    "context_russian": "ситуация_использования_2"
                }},
                {{
                    "korean_sentence": "예문3",
                    "russian_translation": "러시아어_번역3",
                    "grammar_note": "문법_설명3",
                    "grammar_note_russian": "грамматическое_объяснение_3",
                    "context": "사용_상황3",
                    "context_russian": "ситуация_использования_3"
                }}
            ]
        }}
        """
        
        result = await vocabulary_agent.run(prompt)
        return result.data
        
    except Exception as e:
        # 에러 발생시 백업 함수 사용
        return await generate_vocabulary_fallback(input_text)

# Gemini API를 직접 사용하는 백업 함수
async def generate_vocabulary_fallback(input_text: str) -> VocabularyEntry:
    """PydanticAI가 실패할 경우 사용하는 백업 함수"""
    if not GOOGLE_API_KEY:
        # API 키가 없으면 기본 예제 반환
        return create_basic_entry(input_text, "Google API 키가 설정되지 않음")
        
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # 언어 감지
        detected_language = detect_language(input_text)
        
        if detected_language == "russian":
            prompt = f"""
            러시아어 단어/표현 "{input_text}"를 한국어로 번역하여 JSON 형식으로 응답해주세요:
            """
        else:
            prompt = f"""
            한국어 단어/표현 "{input_text}"에 대해 맞춤법 검증을 포함하여 JSON 형식으로 응답해주세요:
        
            {{
                "spelling_check": {{
                    "original_word": "{input_text}",
                    "corrected_word": "올바른_맞춤법",
                    "has_spelling_error": true/false,
                    "correction_note": "맞춤법 설명 (필요시)"
                }},
                "original_word": "올바른_맞춤법",
                "russian_translation": "러시아어 번역",
                "pronunciation": "[발음표기]",
                "usage_examples": [
                    {{
                        "korean_sentence": "예문1",
                        "russian_translation": "러시아어 번역1",
                        "grammar_note": "문법 설명1",
                        "grammar_note_russian": "грамматическое объяснение 1",
                        "context": "사용 상황1",
                        "context_russian": "ситуация использования 1"
                    }},
                    {{
                        "korean_sentence": "예문2", 
                        "russian_translation": "러시아어 번역2",
                        "grammar_note": "문법 설명2",
                        "grammar_note_russian": "грамматическое объяснение 2",
                        "context": "사용 상황2",
                        "context_russian": "ситуация использования 2"
                    }},
                    {{
                        "korean_sentence": "예문3",
                        "russian_translation": "러시아어 번역3", 
                        "grammar_note": "문법 설명3",
                        "grammar_note_russian": "грамматическое объяснение 3",
                        "context": "사용 상황3",
                        "context_russian": "ситуация использования 3"
                    }}
                ]
            }}
            
            1단계: 입력된 단어의 맞춤법을 확인하세요.
            2단계: 올바른 맞춤법으로 연인 관계에서 자주 사용되는 자연스러운 예문을 작성해주세요.
            """
        
        response = model.generate_content(prompt)
        
        # JSON 파싱 시도
        try:
            json_text = response.text.strip()
            if json_text.startswith('```json'):
                json_text = json_text[7:-3].strip()
            elif json_text.startswith('```'):
                json_text = json_text[3:-3].strip()
                
            data = json.loads(json_text)
            return VocabularyEntry(**data)
            
        except json.JSONDecodeError:
            # JSON 파싱 실패시 기본 구조 반환
            return create_basic_entry(input_text, response.text)
            
    except Exception as e:
        return create_basic_entry(input_text, f"오류: {str(e)}")

def create_basic_entry(input_text: str, error_info: str = "") -> VocabularyEntry:
    """기본 어휘 엔트리 생성"""
    # 언어 감지
    detected_language = detect_language(input_text)
    
    if detected_language == "russian":
        # 러시아어 입력인 경우
        return VocabularyEntry(
            original_word="번역 필요",
            russian_translation=input_text,
            pronunciation="[한국어 발음]",
            spelling_check=SpellCheckInfo(
                original_word=input_text,
                corrected_word=input_text,
                has_spelling_error=False,
                correction_note=None
            ),
            usage_examples=[
                UsageExample(
                    korean_sentence="번역이 필요합니다",
                    russian_translation=f"Используйте: {input_text}",
                    grammar_note="기본 사용법",
                    grammar_note_russian="базовое использование",
                    context="일반적인 상황",
                    context_russian="общая ситуация"
                ),
                UsageExample(
                    korean_sentence="연결이 필요합니다",
                    russian_translation=f"Попробуйте: {input_text}",
                    grammar_note="시도 표현",
                    grammar_note_russian="выражение попытки",
                    context="시도할 때",
                    context_russian="при попытке"
                ),
                UsageExample(
                    korean_sentence="도움이 필요합니다",
                    russian_translation=f"Помогите с: {input_text}",
                    grammar_note="도움 요청",
                    grammar_note_russian="просьба о помощи",
                    context="도움을 요청할 때",
                    context_russian="при просьбе о помощи"
                )
            ]
        )
    else:
        # 한국어 입력인 경우
        return VocabularyEntry(
            original_word=input_text,
            russian_translation="번역 필요",
            pronunciation=f"[{input_text}]",
            spelling_check=SpellCheckInfo(
                original_word=input_text,
                corrected_word=input_text,
                has_spelling_error=False,
                correction_note=None
            ),
            usage_examples=[
                UsageExample(
                    korean_sentence=f"{input_text}를 사용해보세요",
                    russian_translation="Попробуйте использовать это слово",
                    grammar_note="기본 사용법",
                    grammar_note_russian="базовое использование",
                    context="일반적인 상황",
                    context_russian="общая ситуация"
                ),
                UsageExample(
                    korean_sentence=f"정말 {input_text}네요",
                    russian_translation="Действительно...",
                    grammar_note="감탄 표현",
                    grammar_note_russian="восклицательное выражение",
                    context="감정 표현시",
                    context_russian="при выражении эмоций"
                ),
                UsageExample(
                    korean_sentence=f"{input_text}라고 생각해요",
                    russian_translation="Я думаю, что...",
                    grammar_note="의견 표현",
                    grammar_note_russian="выражение мнения",
                    context="의견을 말할 때",
                    context_russian="при выражении мнения"
                )
            ]
        )