import json
import os
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging
from .models import BookmarkEntry, ChatMessage

logger = logging.getLogger(__name__)

class BookmarkStorage:
    """북마크 저장 및 관리 클래스"""
    
    def __init__(self, storage_file: str = "bookmarks.json"):
        self.storage_file = storage_file
        self.bookmarks: Dict[str, BookmarkEntry] = {}
        self.load_all_bookmarks()
    
    def load_all_bookmarks(self) -> None:
        """모든 북마크를 파일에서 로드"""
        try:
            if os.path.exists(self.storage_file):
                with open(self.storage_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for bookmark_data in data.get('bookmarks', []):
                        # ISO 문자열을 datetime 객체로 변환
                        for date_field in ['created_at', 'last_reviewed', 'next_review_date']:
                            if date_field in bookmark_data and isinstance(bookmark_data[date_field], str):
                                bookmark_data[date_field] = datetime.fromisoformat(bookmark_data[date_field])
                        
                        # usage_examples 처리 (중첩된 객체)
                        if 'usage_examples' in bookmark_data and bookmark_data['usage_examples']:
                            # 이미 UsageExample 객체 형태로 저장되어 있음
                            pass
                        
                        bookmark = BookmarkEntry(**bookmark_data)
                        self.bookmarks[bookmark.id] = bookmark
                        
                logger.info(f"✅ {len(self.bookmarks)}개 북마크 로드 완료")
            else:
                logger.info("📝 새로운 북마크 저장소 생성")
                self.bookmarks = {}
        except Exception as e:
            logger.error(f"❌ 북마크 로드 실패: {e}")
            self.bookmarks = {}
    
    def save_all_bookmarks(self) -> bool:
        """모든 북마크를 파일에 저장"""
        try:
            # Pydantic 모델을 dict로 변환 (datetime을 ISO 문자열로)
            bookmarks_data = []
            for bookmark in self.bookmarks.values():
                bookmark_dict = bookmark.dict()
                
                # datetime 객체들을 ISO 문자열로 변환
                for date_field in ['created_at', 'last_reviewed', 'next_review_date']:
                    if date_field in bookmark_dict and bookmark_dict[date_field]:
                        if hasattr(bookmark_dict[date_field], 'isoformat'):
                            bookmark_dict[date_field] = bookmark_dict[date_field].isoformat()
                
                bookmarks_data.append(bookmark_dict)
            
            data = {
                "bookmarks": bookmarks_data,
                "last_updated": datetime.now().isoformat()
            }
            
            with open(self.storage_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"💾 {len(self.bookmarks)}개 북마크 저장 완료")
            return True
        except Exception as e:
            logger.error(f"❌ 북마크 저장 실패: {e}")
            return False
    
    def create_bookmark(self, session_id: str, message: ChatMessage) -> BookmarkEntry:
        """새로운 북마크 생성"""
        
        # 기존 북마크 중복 확인
        existing_bookmark = self.find_bookmark_by_message(session_id, message.id)
        if existing_bookmark:
            logger.info(f"북마크가 이미 존재함: {message.id}")
            return existing_bookmark
        
        # 북마크 생성
        bookmark = BookmarkEntry(
            session_id=session_id,
            message_id=message.id,
            korean_text=message.text,
            russian_translation=message.russian_translation or "",
            pronunciation=message.pronunciation,
            usage_examples=message.usage_examples,
            next_review_date=datetime.now() + timedelta(days=1)  # 첫 복습은 1일 후
        )
        
        self.bookmarks[bookmark.id] = bookmark
        self.save_all_bookmarks()
        
        logger.info(f"🦊 새 북마크 생성: {bookmark.korean_text[:20]}...")
        return bookmark
    
    def find_bookmark_by_message(self, session_id: str, message_id: str) -> Optional[BookmarkEntry]:
        """특정 메시지의 북마크 찾기"""
        for bookmark in self.bookmarks.values():
            if bookmark.session_id == session_id and bookmark.message_id == message_id:
                return bookmark
        return None
    
    def delete_bookmark(self, bookmark_id: str) -> bool:
        """북마크 삭제"""
        if bookmark_id in self.bookmarks:
            bookmark = self.bookmarks[bookmark_id]
            del self.bookmarks[bookmark_id]
            self.save_all_bookmarks()
            logger.info(f"🗑️ 북마크 삭제: {bookmark.korean_text[:20]}...")
            return True
        return False
    
    def get_all_bookmarks(self, limit: int = 100) -> List[BookmarkEntry]:
        """모든 북마크를 최신순으로 반환"""
        bookmarks = list(self.bookmarks.values())
        bookmarks.sort(key=lambda x: x.created_at, reverse=True)
        return bookmarks[:limit]
    
    def get_bookmarks_for_review(self) -> List[BookmarkEntry]:
        """복습이 필요한 북마크들 반환"""
        now = datetime.now()
        review_bookmarks = []
        
        for bookmark in self.bookmarks.values():
            if bookmark.next_review_date and bookmark.next_review_date <= now:
                review_bookmarks.append(bookmark)
        
        # 복습 우선순위: 오래된 것부터, 어려운 것부터
        review_bookmarks.sort(key=lambda x: (x.next_review_date, x.difficulty_level), reverse=True)
        return review_bookmarks
    
    def update_review(self, bookmark_id: str, difficulty_rating: int) -> bool:
        """복습 완료 처리 (간격반복학습 알고리즘)"""
        if bookmark_id not in self.bookmarks:
            return False
        
        bookmark = self.bookmarks[bookmark_id]
        bookmark.review_count += 1
        bookmark.last_reviewed = datetime.now()
        bookmark.difficulty_level = max(1, min(5, difficulty_rating))  # 1-5 범위 제한
        
        # 간격반복학습 알고리즘 (난이도에 따른 다음 복습 간격)
        intervals = {
            1: 1,    # 매우 쉬움: 1일 후
            2: 3,    # 쉬움: 3일 후
            3: 7,    # 보통: 1주일 후
            4: 14,   # 어려움: 2주일 후
            5: 30    # 매우 어려움: 1달 후
        }
        
        # 복습 횟수에 따른 배수 적용
        multiplier = min(bookmark.review_count, 5)  # 최대 5배
        days_to_add = intervals[difficulty_rating] * multiplier
        
        bookmark.next_review_date = datetime.now() + timedelta(days=days_to_add)
        
        self.save_all_bookmarks()
        logger.info(f"📚 복습 완료: {bookmark.korean_text[:20]}... (다음 복습: {days_to_add}일 후)")
        return True
    
    def get_bookmarks_by_session(self, session_id: str) -> List[BookmarkEntry]:
        """특정 세션의 북마크들 반환"""
        session_bookmarks = [
            bookmark for bookmark in self.bookmarks.values() 
            if bookmark.session_id == session_id
        ]
        session_bookmarks.sort(key=lambda x: x.created_at, reverse=True)
        return session_bookmarks
    
    def search_bookmarks(self, query: str) -> List[BookmarkEntry]:
        """텍스트 검색으로 북마크 찾기"""
        query = query.lower().strip()
        if not query:
            return []
        
        matching_bookmarks = []
        for bookmark in self.bookmarks.values():
            # 한국어 텍스트 또는 러시아어 번역에서 검색
            if (query in bookmark.korean_text.lower() or 
                query in bookmark.russian_translation.lower()):
                matching_bookmarks.append(bookmark)
        
        matching_bookmarks.sort(key=lambda x: x.created_at, reverse=True)
        return matching_bookmarks
    
    def get_bookmark_stats(self) -> Dict:
        """북마크 통계 정보 반환"""
        total_bookmarks = len(self.bookmarks)
        review_needed = len(self.get_bookmarks_for_review())
        
        if total_bookmarks > 0:
            avg_difficulty = sum(b.difficulty_level for b in self.bookmarks.values()) / total_bookmarks
            avg_reviews = sum(b.review_count for b in self.bookmarks.values()) / total_bookmarks
            latest_bookmark = max(self.bookmarks.values(), key=lambda x: x.created_at)
        else:
            avg_difficulty = 0
            avg_reviews = 0
            latest_bookmark = None
        
        return {
            "total_bookmarks": total_bookmarks,
            "review_needed": review_needed,
            "avg_difficulty": round(avg_difficulty, 1),
            "avg_reviews": round(avg_reviews, 1),
            "latest_bookmark": latest_bookmark.created_at if latest_bookmark else None
        }

# 전역 북마크 스토리지 인스턴스
bookmark_storage = BookmarkStorage()