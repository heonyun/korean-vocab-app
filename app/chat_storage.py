import json
import os
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging
from .models import ChatSession, ChatMessage

logger = logging.getLogger(__name__)

class ChatStorage:
    """채팅 세션 저장 및 관리 클래스"""
    
    def __init__(self, storage_file: str = "chat_sessions.json"):
        self.storage_file = storage_file
        self.sessions: Dict[str, ChatSession] = {}
        self.load_all_sessions()
    
    def load_all_sessions(self) -> None:
        """모든 세션을 파일에서 로드"""
        try:
            if os.path.exists(self.storage_file):
                with open(self.storage_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for session_data in data.get('sessions', []):
                        # ISO 문자열을 datetime 객체로 변환
                        if 'created_at' in session_data and isinstance(session_data['created_at'], str):
                            session_data['created_at'] = datetime.fromisoformat(session_data['created_at'])
                        if 'last_updated' in session_data and isinstance(session_data['last_updated'], str):
                            session_data['last_updated'] = datetime.fromisoformat(session_data['last_updated'])
                        
                        # 메시지들의 timestamp도 변환
                        for message in session_data.get('messages', []):
                            if 'timestamp' in message and isinstance(message['timestamp'], str):
                                message['timestamp'] = datetime.fromisoformat(message['timestamp'])
                        
                        session = ChatSession(**session_data)
                        self.sessions[session.session_id] = session
                logger.info(f"✅ {len(self.sessions)}개 채팅 세션 로드 완료")
            else:
                logger.info("📝 새로운 채팅 저장소 생성")
                self.sessions = {}
        except Exception as e:
            logger.error(f"❌ 채팅 세션 로드 실패: {e}")
            self.sessions = {}
    
    def save_all_sessions(self) -> bool:
        """모든 세션을 파일에 저장"""
        try:
            # Pydantic 모델을 dict로 변환 (datetime을 ISO 문자열로)
            sessions_data = []
            for session in self.sessions.values():
                session_dict = session.dict()
                # datetime 객체들을 ISO 문자열로 변환
                if 'created_at' in session_dict and session_dict['created_at']:
                    session_dict['created_at'] = session_dict['created_at'].isoformat()
                if 'last_updated' in session_dict and session_dict['last_updated']:
                    session_dict['last_updated'] = session_dict['last_updated'].isoformat()
                
                # 메시지들의 timestamp도 변환
                for message in session_dict.get('messages', []):
                    if 'timestamp' in message and message['timestamp']:
                        if hasattr(message['timestamp'], 'isoformat'):
                            message['timestamp'] = message['timestamp'].isoformat()
                        
                sessions_data.append(session_dict)
            
            data = {
                "sessions": sessions_data,
                "last_updated": datetime.now().isoformat()
            }
            
            with open(self.storage_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"💾 {len(self.sessions)}개 채팅 세션 저장 완료")
            return True
        except Exception as e:
            logger.error(f"❌ 채팅 세션 저장 실패: {e}")
            return False
    
    def create_session(self, first_message: Optional[str] = None) -> ChatSession:
        """새로운 채팅 세션 생성"""
        session = ChatSession()
        
        # 시스템 환영 메시지 추가
        welcome_msg = ChatMessage(
            type="system",
            text="👋 안녕하세요! 한국어 ↔ 러시아어 번역을 도와드릴게요!\n💡 팁: /로 상황을 설명할 수 있어요!\n\nFor Emma, my eternal Muse\nv0.1.5"
        )
        session.add_message(welcome_msg)
        
        # 첫 메시지가 있으면 추가
        if first_message:
            user_msg = ChatMessage(
                type="user",
                text=first_message
            )
            session.add_message(user_msg)
        
        self.sessions[session.session_id] = session
        self.save_all_sessions()
        
        logger.info(f"🆕 새 채팅 세션 생성: {session.session_id}")
        return session
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """세션 ID로 특정 세션 조회"""
        return self.sessions.get(session_id)
    
    def add_message_to_session(self, session_id: str, message: ChatMessage) -> bool:
        """특정 세션에 메시지 추가"""
        session = self.get_session(session_id)
        if not session:
            logger.error(f"❌ 세션을 찾을 수 없음: {session_id}")
            return False
        
        session.add_message(message)
        self.save_all_sessions()
        
        logger.info(f"📨 메시지 추가 완료: {session_id} (총 {session.message_count}개)")
        return True
    
    def get_all_sessions(self, limit: int = 50) -> List[ChatSession]:
        """모든 세션을 최신순으로 반환"""
        sessions = list(self.sessions.values())
        # 마지막 업데이트 시간으로 정렬 (최신순)
        sessions.sort(key=lambda x: x.last_updated, reverse=True)
        return sessions[:limit]
    
    def get_sessions_by_date(self) -> Dict[str, List[ChatSession]]:
        """날짜별로 그룹핑된 세션 반환"""
        now = datetime.now()
        today = now.date()
        yesterday = (now - timedelta(days=1)).date()
        this_week_start = (now - timedelta(days=now.weekday())).date()
        
        grouped = {
            "오늘": [],
            "어제": [],
            "이번 주": [],
            "이전": []
        }
        
        for session in self.get_all_sessions():
            session_date = session.last_updated.date()
            
            if session_date == today:
                grouped["오늘"].append(session)
            elif session_date == yesterday:
                grouped["어제"].append(session)
            elif session_date >= this_week_start:
                grouped["이번 주"].append(session)
            else:
                grouped["이전"].append(session)
        
        # 빈 그룹 제거
        return {k: v for k, v in grouped.items() if v}
    
    def delete_session(self, session_id: str) -> bool:
        """세션 삭제"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            self.save_all_sessions()
            logger.info(f"🗑️ 세션 삭제 완료: {session_id}")
            return True
        return False
    
    def clear_old_sessions(self, days: int = 30) -> int:
        """지정된 일수보다 오래된 세션 삭제"""
        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_count = 0
        
        sessions_to_delete = []
        for session_id, session in self.sessions.items():
            if session.last_updated < cutoff_date:
                sessions_to_delete.append(session_id)
        
        for session_id in sessions_to_delete:
            del self.sessions[session_id]
            deleted_count += 1
        
        if deleted_count > 0:
            self.save_all_sessions()
            logger.info(f"🧹 {deleted_count}개 오래된 세션 정리 완료")
        
        return deleted_count
    
    def get_session_stats(self) -> Dict:
        """세션 통계 정보 반환"""
        total_sessions = len(self.sessions)
        total_messages = sum(session.message_count for session in self.sessions.values())
        
        if total_sessions > 0:
            avg_messages = total_messages / total_sessions
            latest_session = max(self.sessions.values(), key=lambda x: x.last_updated)
        else:
            avg_messages = 0
            latest_session = None
        
        return {
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "avg_messages_per_session": round(avg_messages, 1),
            "latest_activity": latest_session.last_updated if latest_session else None
        }

# 전역 채팅 스토리지 인스턴스
chat_storage = ChatStorage()