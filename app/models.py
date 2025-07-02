from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
import uuid

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
    context_russian: Optional[str] = None  # 러시아어 상황 설명 추가

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

# 채팅 관련 모델들

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["user", "ai", "system"] = "user"
    text: str
    timestamp: datetime = Field(default_factory=datetime.now)
    
    # AI 응답 전용 필드들
    pronunciation: Optional[str] = None
    russian_translation: Optional[str] = None
    usage_examples: Optional[List[UsageExample]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class ChatSession(BaseModel):
    session_id: str = Field(default_factory=lambda: f"{datetime.now().strftime('%Y-%m-%d')}-{str(uuid.uuid4())[:8]}")
    title: str = "새 대화"
    created_at: datetime = Field(default_factory=datetime.now)
    last_updated: datetime = Field(default_factory=datetime.now)
    message_count: int = 0
    messages: List[ChatMessage] = []
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
    
    def add_message(self, message: ChatMessage) -> None:
        """메시지를 세션에 추가하고 메타데이터 업데이트"""
        self.messages.append(message)
        self.message_count = len(self.messages)
        self.last_updated = datetime.now()
        
        # 첫 3개 사용자 메시지로 자동 제목 생성
        if not hasattr(self, '_title_generated') or not self._title_generated:
            user_messages = [msg.text for msg in self.messages if msg.type == "user"]
            if len(user_messages) >= 1:
                self.title = ", ".join(user_messages[:3])
                if len(user_messages) > 3:
                    self.title += "..."
                self._title_generated = True

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    success: bool
    session_id: str
    message: Optional[ChatMessage] = None
    error: Optional[str] = None

class SessionListResponse(BaseModel):
    success: bool
    sessions: List[ChatSession] = []
    error: Optional[str] = None

# 북마크 관련 모델들

class BookmarkEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    message_id: str
    korean_text: str
    russian_translation: str
    pronunciation: Optional[str] = None
    usage_examples: Optional[List[UsageExample]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    review_count: int = 0
    last_reviewed: Optional[datetime] = None
    next_review_date: Optional[datetime] = None
    difficulty_level: int = 1  # 1-5, 어려울수록 높은 숫자
    tags: List[str] = []
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class BookmarkRequest(BaseModel):
    session_id: str
    message_id: str

class BookmarkResponse(BaseModel):
    success: bool
    bookmark: Optional[BookmarkEntry] = None
    error: Optional[str] = None

class BookmarkListResponse(BaseModel):
    success: bool
    bookmarks: List[BookmarkEntry] = []
    total_count: int = 0
    error: Optional[str] = None