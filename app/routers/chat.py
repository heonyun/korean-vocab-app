from fastapi import APIRouter, HTTPException
from typing import List
import logging

from ..models import (
    ChatRequest, ChatResponse, ChatMessage, SessionListResponse, ChatSession,
    BookmarkRequest, BookmarkResponse, BookmarkListResponse
)
from ..ai_service import generate_vocabulary_entry
from ..chat_storage import chat_storage
from ..bookmark_storage import bookmark_storage

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/api/chat/send", response_model=ChatResponse)
async def send_chat_message(request: ChatRequest):
    """채팅 메시지 전송 및 AI 응답 생성"""
    try:
        logger.info(f"채팅 메시지 수신: {request.message} (세션: {request.session_id})")
        
        # 세션 확인 또는 생성
        if request.session_id:
            session = chat_storage.get_session(request.session_id)
            if not session:
                # 세션이 없으면 새로 생성
                session = chat_storage.create_session(request.message)
                logger.info(f"기존 세션을 찾을 수 없어 새 세션 생성: {session.session_id}")
        else:
            # 새 세션 생성
            session = chat_storage.create_session(request.message)
            logger.info(f"새 채팅 세션 생성: {session.session_id}")
        
        # 사용자 메시지가 이미 추가되지 않았으면 추가
        if not request.session_id or len(session.messages) == 1:  # 시스템 메시지만 있는 경우
            user_message = ChatMessage(
                type="user",
                text=request.message
            )
            chat_storage.add_message_to_session(session.session_id, user_message)
        
        # AI 응답 생성
        try:
            vocabulary_entry = await generate_vocabulary_entry(request.message)
            logger.info(f"AI 응답 생성 성공: {request.message}")
            
            # AI 응답 메시지 생성
            ai_message = ChatMessage(
                type="ai",
                text=vocabulary_entry.russian_translation,
                pronunciation=vocabulary_entry.pronunciation,
                russian_translation=vocabulary_entry.russian_translation,
                usage_examples=vocabulary_entry.usage_examples
            )
            
        except Exception as e:
            logger.warning(f"AI 응답 생성 실패, 기본 응답 사용: {e}")
            ai_message = ChatMessage(
                type="ai",
                text="죄송합니다. 번역을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.",
                pronunciation="[오류]"
            )
        
        # AI 응답을 세션에 추가
        chat_storage.add_message_to_session(session.session_id, ai_message)
        
        return ChatResponse(
            success=True,
            session_id=session.session_id,
            message=ai_message
        )
        
    except Exception as e:
        logger.error(f"채팅 메시지 처리 오류: {str(e)}")
        return ChatResponse(
            success=False,
            session_id=request.session_id or "",
            error=f"메시지 처리 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/api/chat/sessions", response_model=SessionListResponse)
async def get_chat_sessions():
    """모든 채팅 세션 목록 반환 (날짜별 그룹핑)"""
    try:
        sessions_by_date = chat_storage.get_sessions_by_date()
        all_sessions = []
        
        # 날짜별 그룹을 평면 리스트로 변환
        for date_group, sessions in sessions_by_date.items():
            all_sessions.extend(sessions)
        
        return SessionListResponse(
            success=True,
            sessions=all_sessions
        )
    except Exception as e:
        logger.error(f"세션 목록 조회 오류: {str(e)}")
        return SessionListResponse(
            success=False,
            error=f"세션 목록을 불러올 수 없습니다: {str(e)}"
        )

@router.get("/api/chat/sessions/{session_id}", response_model=ChatSession)
async def get_chat_session(session_id: str):
    """특정 채팅 세션 상세 정보 반환"""
    try:
        session = chat_storage.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
        
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 정보를 불러올 수 없습니다: {str(e)}")

@router.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    """채팅 세션 삭제"""
    try:
        success = chat_storage.delete_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
        
        return {"success": True, "message": f"세션 '{session_id}'가 삭제되었습니다"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 삭제 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 삭제 중 오류가 발생했습니다: {str(e)}")

@router.post("/api/chat/sessions/new", response_model=ChatResponse)
async def create_new_chat_session():
    """새로운 채팅 세션 생성"""
    try:
        session = chat_storage.create_session()
        
        # 환영 메시지를 응답으로 반환
        welcome_message = session.messages[0] if session.messages else None
        
        return ChatResponse(
            success=True,
            session_id=session.session_id,
            message=welcome_message
        )
    except Exception as e:
        logger.error(f"새 세션 생성 오류: {str(e)}")
        return ChatResponse(
            success=False,
            session_id="",
            error=f"새 세션을 생성할 수 없습니다: {str(e)}"
        )

@router.get("/api/chat/stats")
async def get_chat_stats():
    """채팅 세션 통계 정보"""
    try:
        stats = chat_storage.get_session_stats()
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        logger.error(f"통계 조회 오류: {str(e)}")
        return {
            "success": False,
            "error": f"통계 정보를 불러올 수 없습니다: {str(e)}"
        }

# 북마크 관련 API 엔드포인트들

@router.post("/api/bookmarks/create", response_model=BookmarkResponse)
async def create_bookmark(request: BookmarkRequest):
    """메시지를 북마크로 추가"""
    try:
        # 세션과 메시지 확인
        session = chat_storage.get_session(request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
        
        # 해당 메시지 찾기
        target_message = None
        for message in session.messages:
            if message.id == request.message_id:
                target_message = message
                break
        
        if not target_message:
            raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다")
        
        if target_message.type != "ai":
            raise HTTPException(status_code=400, detail="AI 응답만 북마크할 수 있습니다")
        
        # 북마크 생성
        bookmark = bookmark_storage.create_bookmark(request.session_id, target_message)
        
        logger.info(f"북마크 생성 완료: {bookmark.korean_text[:20]}...")
        return BookmarkResponse(success=True, bookmark=bookmark)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"북마크 생성 오류: {str(e)}")
        return BookmarkResponse(
            success=False,
            error=f"북마크 생성 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/api/bookmarks", response_model=BookmarkListResponse)
async def get_all_bookmarks(limit: int = 50):
    """모든 북마크 목록 반환"""
    try:
        bookmarks = bookmark_storage.get_all_bookmarks(limit)
        return BookmarkListResponse(
            success=True,
            bookmarks=bookmarks,
            total_count=len(bookmarks)
        )
    except Exception as e:
        logger.error(f"북마크 목록 조회 오류: {str(e)}")
        return BookmarkListResponse(
            success=False,
            error=f"북마크 목록을 불러올 수 없습니다: {str(e)}"
        )

@router.get("/api/bookmarks/review", response_model=BookmarkListResponse)
async def get_review_bookmarks():
    """복습이 필요한 북마크들 반환"""
    try:
        bookmarks = bookmark_storage.get_bookmarks_for_review()
        return BookmarkListResponse(
            success=True,
            bookmarks=bookmarks,
            total_count=len(bookmarks)
        )
    except Exception as e:
        logger.error(f"복습 북마크 조회 오류: {str(e)}")
        return BookmarkListResponse(
            success=False,
            error=f"복습 북마크를 불러올 수 없습니다: {str(e)}"
        )

@router.post("/api/bookmarks/{bookmark_id}/review")
async def complete_review(bookmark_id: str, difficulty_rating: int):
    """북마크 복습 완료 처리"""
    try:
        if not (1 <= difficulty_rating <= 5):
            raise HTTPException(status_code=400, detail="난이도는 1-5 사이의 값이어야 합니다")
        
        success = bookmark_storage.update_review(bookmark_id, difficulty_rating)
        if not success:
            raise HTTPException(status_code=404, detail="북마크를 찾을 수 없습니다")
        
        return {"success": True, "message": "복습이 완료되었습니다"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"복습 완료 처리 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"복습 처리 중 오류가 발생했습니다: {str(e)}")

@router.delete("/api/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str):
    """북마크 삭제"""
    try:
        success = bookmark_storage.delete_bookmark(bookmark_id)
        if not success:
            raise HTTPException(status_code=404, detail="북마크를 찾을 수 없습니다")
        
        return {"success": True, "message": f"북마크가 삭제되었습니다"}
    except HTTPException:
        raise
