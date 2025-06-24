from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class SpellCheckInfo(BaseModel):
    original_word: str
    corrected_word: str
    has_spelling_error: bool
    correction_note: Optional[str] = None

class UsageExample(BaseModel):
    korean_sentence: str
    russian_translation: str
    grammar_note: str
    grammar_note_russian: str  # 러시아어 문법 설명 추가
    context: str

class VocabularyEntry(BaseModel):
    id: Optional[str] = None
    original_word: str
    russian_translation: str
    pronunciation: str
    usage_examples: List[UsageExample]
    spelling_check: Optional[SpellCheckInfo] = None
    created_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class VocabularyRequest(BaseModel):
    korean_word: str

class VocabularyResponse(BaseModel):
    success: bool
    data: Optional[VocabularyEntry] = None
    error: Optional[str] = None