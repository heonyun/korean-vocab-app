import os
import json
from typing import List
import google.generativeai as genai
from pydantic_ai import Agent
from .models import VocabularyEntry, UsageExample

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

# PydanticAI Agent 설정 (API 키가 있을 때만)
vocabulary_agent = None
if GOOGLE_API_KEY:
    try:
        vocabulary_agent = Agent(
            'gemini-2.0-flash-exp',
            result_type=VocabularyEntry,
            system_prompt="""당신은 러시아인이 한국어를 배우는 것을 도와주는 전문 언어 교사입니다.

사용자가 한국어 단어를 입력하면, 다음을 제공해주세요:
1. 정확한 러시아어 번역
2. 한국어 발음 표기 (로마자)
3. 연인 관계에서 사용할 수 있는 3개의 활용 예제

각 활용 예제는:
- 기본형 + 수식어 조합
- 문법 변화형 (과거/현재/미래, 높임말/반말)
- 상황별 활용 (전화, 메시지, 대면 대화)

각 예제마다 러시아어 번역과 문법 설명(한국어와 러시아어 둘 다), 사용 상황을 포함해주세요.
모든 응답은 연인 관계의 자연스러운 대화 맥락에서 사용 가능해야 합니다."""
        )
    except Exception as e:
        print(f"⚠️  PydanticAI 에이전트 초기화 실패: {e}")
        vocabulary_agent = None

async def generate_vocabulary_entry(korean_word: str) -> VocabularyEntry:
    """한국어 단어를 입력받아 어휘 학습 데이터를 생성합니다."""
    if not vocabulary_agent:
        # API 키가 없으면 백업 함수 사용
        return await generate_vocabulary_fallback(korean_word)
    
    try:
        prompt = f"""
        한국어 단어: "{korean_word}"

        이 단어에 대해 다음을 생성해주세요:
        1. 러시아어 번역
        2. 발음 표기 (예: [an-nyeong])
        3. 연인 관계에서 사용할 수 있는 3개 활용 예제

        각 예제는 다음 형식으로:
        - korean_sentence: 한국어 문장
        - russian_translation: 러시아어 번역
        - grammar_note: 문법 설명 (한국어로)
        - grammar_note_russian: 문법 설명 (러시아어로)
        - context: 사용 상황 (예: "전화통화시", "메시지 보낼때", "직접 만났을때")

        응답은 반드시 JSON 형식으로 VocabularyEntry 모델에 맞춰 작성해주세요.
        """
        
        result = await vocabulary_agent.run(prompt)
        return result.data
        
    except Exception as e:
        # 에러 발생시 백업 함수 사용
        return await generate_vocabulary_fallback(korean_word)

# Gemini API를 직접 사용하는 백업 함수
async def generate_vocabulary_fallback(korean_word: str) -> VocabularyEntry:
    """PydanticAI가 실패할 경우 사용하는 백업 함수"""
    if not GOOGLE_API_KEY:
        # API 키가 없으면 기본 예제 반환
        return create_basic_entry(korean_word, "Google API 키가 설정되지 않음")
        
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""
        한국어 단어 "{korean_word}"에 대해 JSON 형식으로 응답해주세요:
        
        {{
            "original_word": "{korean_word}",
            "russian_translation": "러시아어 번역",
            "pronunciation": "[발음표기]",
            "usage_examples": [
                {{
                    "korean_sentence": "예문1",
                    "russian_translation": "러시아어 번역1",
                    "grammar_note": "문법 설명1",
                    "grammar_note_russian": "грамматическое объяснение 1",
                    "context": "사용 상황1"
                }},
                {{
                    "korean_sentence": "예문2", 
                    "russian_translation": "러시아어 번역2",
                    "grammar_note": "문법 설명2",
                    "grammar_note_russian": "грамматическое объяснение 2",
                    "context": "사용 상황2"
                }},
                {{
                    "korean_sentence": "예문3",
                    "russian_translation": "러시아어 번역3", 
                    "grammar_note": "문법 설명3",
                    "grammar_note_russian": "грамматическое объяснение 3",
                    "context": "사용 상황3"
                }}
            ]
        }}
        
        연인 관계에서 자주 사용되는 자연스러운 예문으로 작성해주세요.
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
            return create_basic_entry(korean_word, response.text)
            
    except Exception as e:
        return create_basic_entry(korean_word, f"오류: {str(e)}")

def create_basic_entry(korean_word: str, error_info: str = "") -> VocabularyEntry:
    """기본 어휘 엔트리 생성"""
    return VocabularyEntry(
        original_word=korean_word,
        russian_translation="번역 필요",
        pronunciation=f"[{korean_word}]",
        usage_examples=[
            UsageExample(
                korean_sentence=f"{korean_word}를 사용해보세요",
                russian_translation="Попробуйте использовать это слово",
                grammar_note="기본 사용법",
                grammar_note_russian="базовое использование",
                context="일반적인 상황"
            ),
            UsageExample(
                korean_sentence=f"정말 {korean_word}네요",
                russian_translation="Действительно...",
                grammar_note="감탄 표현",
                grammar_note_russian="восклицательное выражение",
                context="감정 표현시"
            ),
            UsageExample(
                korean_sentence=f"{korean_word}라고 생각해요",
                russian_translation="Я думаю, что...",
                grammar_note="의견 표현",
                grammar_note_russian="выражение мнения",
                context="의견을 말할 때"
            )
        ]
    )