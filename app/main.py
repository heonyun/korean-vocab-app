from fastapi import FastAPI, HTTPException, Request, Form, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import logging
import os
import json

from .models import (
    VocabularyRequest, VocabularyResponse, VocabularyEntry,
    ChatRequest, ChatResponse, ChatMessage, ChatSession, SessionListResponse,
    BookmarkRequest, BookmarkResponse, BookmarkListResponse, BookmarkEntry
)
from .ai_service import generate_vocabulary_entry, generate_vocabulary_fallback
from .storage import storage
from .chat_storage import chat_storage
from .bookmark_storage import bookmark_storage
from .terminal_service import (
    parse_terminal_command, 
    process_terminal_translation,
    format_terminal_response,
    TranslationMode
)

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="한국어 어휘 학습 노트",
    description="러시아인을 위한 한국어 어휘 학습 도구",
    version="0.1.6"
)

# 보안 헤더 미들웨어 추가
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # 기본 보안 헤더
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    
    # CSP 헤더 (XSS 보호)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; "
        "img-src 'self' data: https:; "
        "font-src 'self' https:; "
        "connect-src 'self'"
    )
    
    # 캐싱 정책: static 파일은 캐싱 허용, API는 no-cache
    if not request.url.path.startswith('/static'):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    
    # JSON 응답에 charset 추가
    if response.headers.get("content-type") == "application/json":
        response.headers["content-type"] = "application/json; charset=utf-8"
    
    return response

# 정적 파일 및 템플릿 설정
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/")
async def home(request: Request):
    """메인 페이지 - 채팅 인터페이스로 리다이렉트"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/chat", status_code=302)

# PWA 관련 라우트들
@app.get("/manifest.json")
async def get_manifest():
    """PWA Manifest 파일 제공"""
    return FileResponse(
        "static/manifest.json",
        media_type="application/manifest+json",
        headers={
            "Cache-Control": "public, max-age=604800",  # 1주일 캐싱
            "Cross-Origin-Embedder-Policy": "credentialless"
        }
    )

@app.get("/sw.js")
async def get_service_worker():
    """Service Worker 파일 제공"""
    return FileResponse(
        "static/sw.js",
        media_type="application/javascript",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",  # SW는 캐싱 안함
            "Service-Worker-Allowed": "/",
            "Cross-Origin-Embedder-Policy": "credentialless"
        }
    )

@app.get("/offline")
async def offline_page(request: Request):
    """오프라인 페이지"""
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "vocabulary_count": 0,
            "vocabulary_list": [],
            "offline": True
        }
    )

@app.post("/api/generate-vocabulary", response_model=VocabularyResponse)
async def generate_vocabulary(request: VocabularyRequest):
    """한국어 단어를 입력받아 어휘 학습 데이터 생성"""
    try:
        korean_word = request.korean_word.strip()
        
        if not korean_word:
            raise HTTPException(status_code=400, detail="한국어 단어를 입력해주세요")
        
        logger.info(f"어휘 생성 요청: {korean_word}")
        
        # 1차: 원본 단어로 기존 저장된 어휘 확인
        existing_entry = storage.get_by_word(korean_word)
        if existing_entry:
            logger.info(f"기존 어휘 반환 (원본): {korean_word}")
            return VocabularyResponse(success=True, data=existing_entry)
        
        # 2차: AI 어휘 생성 및 맞춤법 교정
        try:
            vocabulary_entry = await generate_vocabulary_entry(korean_word)
            logger.info(f"PydanticAI로 어휘 생성 성공: {korean_word}")
        except Exception as e:
            logger.warning(f"PydanticAI 실패, 백업 함수 사용: {e}")
            vocabulary_entry = await generate_vocabulary_fallback(korean_word)
        
        # 3차: 교정된 단어로 기존 어휘 재확인 (API 효율성 개선)
        corrected_word = vocabulary_entry.spelling_check.corrected_word if vocabulary_entry.spelling_check else None
        if corrected_word and corrected_word != korean_word:
            existing_corrected = storage.get_by_word(corrected_word)
            if existing_corrected:
                logger.info(f"기존 어휘 반환 (교정됨): {korean_word} -> {corrected_word}")
                return VocabularyResponse(success=True, data=existing_corrected)
        
        # 4차: 새로운 어휘 저장 (교정된 단어 기준)
        saved_entry = storage.save(vocabulary_entry)
        logger.info(f"어휘 저장 완료: {korean_word} -> {corrected_word or korean_word}")
        
        return VocabularyResponse(success=True, data=saved_entry)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"어휘 생성 오류: {str(e)}")
        return VocabularyResponse(
            success=False, 
            error=f"어휘 생성 중 오류가 발생했습니다: {str(e)}"
        )

# HTMX 전용 엔드포인트들
@app.post("/htmx/generate-vocabulary", response_class=HTMLResponse)
async def generate_vocabulary_htmx(request: Request, korean_word: str = Form(...)):
    """HTMX를 위한 어휘 생성 엔드포인트 - HTML 응답"""
    try:
        korean_word = korean_word.strip()
        
        if not korean_word:
            return templates.TemplateResponse(
                "partials/error.html",
                {"request": request, "error": "한국어 단어를 입력해주세요"}
            )
        
        logger.info(f"HTMX 어휘 생성 요청: {korean_word}")
        
        # 기존 로직과 동일
        existing_entry = storage.get_by_word(korean_word)
        if existing_entry:
            logger.info(f"기존 어휘 반환 (원본): {korean_word}")
            return templates.TemplateResponse(
                "partials/vocabulary_card.html",
                {"request": request, "vocabulary": existing_entry}
            )
        
        # AI 어휘 생성
        try:
            vocabulary_entry = await generate_vocabulary_entry(korean_word)
            logger.info(f"PydanticAI로 어휘 생성 성공: {korean_word}")
        except Exception as e:
            logger.warning(f"PydanticAI 실패, 백업 함수 사용: {e}")
            vocabulary_entry = await generate_vocabulary_fallback(korean_word)
        
        # 교정된 단어 재확인
        corrected_word = vocabulary_entry.spelling_check.corrected_word if vocabulary_entry.spelling_check else None
        if corrected_word and corrected_word != korean_word:
            existing_corrected = storage.get_by_word(corrected_word)
            if existing_corrected:
                logger.info(f"기존 어휘 반환 (교정됨): {korean_word} -> {corrected_word}")
                return templates.TemplateResponse(
                    "partials/vocabulary_card.html",
                    {"request": request, "vocabulary": existing_corrected}
                )
        
        # 새로운 어휘 저장
        saved_entry = storage.save(vocabulary_entry)
        logger.info(f"어휘 저장 완료: {korean_word} -> {corrected_word or korean_word}")
        
        return templates.TemplateResponse(
            "partials/vocabulary_card.html",
            {"request": request, "vocabulary": saved_entry}
        )
        
    except Exception as e:
        logger.error(f"HTMX 어휘 생성 오류: {str(e)}")
        return templates.TemplateResponse(
            "partials/error.html",
            {"request": request, "error": f"어휘 생성 중 오류가 발생했습니다: {str(e)}"}
        )

@app.get("/htmx/vocabulary-list", response_class=HTMLResponse)
async def get_vocabulary_list_htmx(request: Request):
    """HTMX를 위한 어휘 목록 엔드포인트 - HTML 응답"""
    try:
        vocabulary_list = storage.load_all()
        vocabulary_list.sort(key=lambda x: x.created_at or "", reverse=True)
        return templates.TemplateResponse(
            "partials/vocabulary_list.html",
            {"request": request, "vocabulary_list": vocabulary_list[-10:]}  # 최근 10개
        )
    except Exception as e:
        logger.error(f"HTMX 어휘 목록 조회 오류: {str(e)}")
        return templates.TemplateResponse(
            "partials/error.html",
            {"request": request, "error": "어휘 목록을 불러올 수 없습니다"}
        )

@app.post("/htmx/save-vocabulary", response_class=HTMLResponse)
async def save_vocabulary_htmx(request: Request, word: str = Form(...)):
    """HTMX를 위한 어휘 저장 엔드포인트"""
    try:
        # 어휘가 이미 저장되어 있는지 확인
        existing_entry = storage.get_by_word(word)
        if existing_entry:
            return templates.TemplateResponse(
                "partials/notification.html",
                {"request": request, "message": f"'{word}'는 이미 저장되어 있습니다!", "type": "info"}
            )
        
        logger.error(f"저장하려는 어휘를 찾을 수 없습니다: {word}")
        return templates.TemplateResponse(
            "partials/notification.html",
            {"request": request, "message": "저장할 어휘를 찾을 수 없습니다.", "type": "error"}
        )
        
    except Exception as e:
        logger.error(f"HTMX 어휘 저장 오류: {str(e)}")
        return templates.TemplateResponse(
            "partials/notification.html",
            {"request": request, "message": "저장 중 오류가 발생했습니다.", "type": "error"}
        )

@app.delete("/htmx/vocabulary/{word}", response_class=HTMLResponse)
async def delete_vocabulary_htmx(word: str):
    """HTMX를 위한 어휘 삭제 엔드포인트"""
    try:
        success = storage.delete(word)
        if success:
            logger.info(f"어휘 삭제 완료: {word}")
            return HTMLResponse("")  # 빈 응답으로 요소 제거
        else:
            return HTMLResponse(
                '<div class="error-message text-red-500 p-2">삭제할 어휘를 찾을 수 없습니다.</div>'
            )
    except Exception as e:
        logger.error(f"HTMX 어휘 삭제 오류: {str(e)}")
        return HTMLResponse(
            '<div class="error-message text-red-500 p-2">삭제 중 오류가 발생했습니다.</div>'
        )

@app.post("/htmx/validate-input", response_class=HTMLResponse)
async def validate_input_htmx(request: Request, value: str = Form(...)):
    """HTMX를 위한 실시간 입력 검증"""
    try:
        value = value.strip()
        
        # 빈 입력
        if not value:
            return HTMLResponse("")
        
        # 길이 검증
        if len(value) < 1:
            return templates.TemplateResponse(
                "partials/validation_message.html",
                {"request": request, "message": "최소 1글자 이상 입력해주세요.", "type": "warning"}
            )
        
        if len(value) > 50:
            return templates.TemplateResponse(
                "partials/validation_message.html",
                {"request": request, "message": "최대 50글자까지 입력 가능합니다.", "type": "error"}
            )
        
        # 한국어 문자 검증
        import re
        korean_pattern = re.compile(r'^[가-힣0-9\s.,!?~\-()]+$')
        if not korean_pattern.match(value):
            return templates.TemplateResponse(
                "partials/validation_message.html",
                {"request": request, "message": "한국어 문자만 입력 가능합니다.", "type": "error"}
            )
        
        # 유효한 입력
        return templates.TemplateResponse(
            "partials/validation_message.html",
            {"request": request, "message": f"✓ '{value}' 입력이 유효합니다!", "type": "success"}
        )
        
    except Exception as e:
        logger.error(f"입력 검증 오류: {str(e)}")
        return HTMLResponse("")

@app.get("/api/vocabulary", response_model=List[VocabularyEntry])
async def get_all_vocabulary():
    """저장된 모든 어휘 목록 반환"""
    try:
        vocabulary_list = storage.load_all()
        # 최신 순으로 정렬
        vocabulary_list.sort(key=lambda x: x.created_at or "", reverse=True)
        return vocabulary_list
    except Exception as e:
        logger.error(f"어휘 목록 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="어휘 목록을 불러올 수 없습니다")

@app.get("/api/vocabulary/{word}")
async def get_vocabulary_by_word(word: str):
    """특정 단어의 어휘 정보 반환"""
    try:
        entry = storage.get_by_word(word)
        if not entry:
            raise HTTPException(status_code=404, detail="해당 단어를 찾을 수 없습니다")
        return entry
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"어휘 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="어휘 정보를 불러올 수 없습니다")

@app.delete("/api/vocabulary/{word}")
async def delete_vocabulary(word: str):
    """특정 단어 삭제"""
    try:
        success = storage.delete(word)
        if not success:
            raise HTTPException(status_code=404, detail="해당 단어를 찾을 수 없습니다")
        return {"success": True, "message": f"'{word}' 단어가 삭제되었습니다"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"어휘 삭제 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="어휘 삭제 중 오류가 발생했습니다")

@app.get("/health")
async def health_check():
    """서버 상태 확인"""
    return {"status": "healthy", "message": "한국어 어휘 학습 노트 서버 정상 동작중"}

# 터미널 인터페이스 관련 라우트들
@app.get("/terminal", response_class=HTMLResponse)
async def terminal_interface(request: Request):
    """터미널 인터페이스 페이지"""
    return templates.TemplateResponse(
        "terminal.html",
        {"request": request}
    )

# WebSocket 세션 관리
class TerminalSession:
    def __init__(self):
        self.mode = TranslationMode.AUTO
        self.translation_count = 0
        self.command_count = 0
    
    def update_stats(self, message_type: str):
        if message_type == "translation":
            self.translation_count += 1
        elif message_type == "command":
            self.command_count += 1

async def safe_send_message(websocket: WebSocket, message: dict):
    """안전한 WebSocket 메시지 전송"""
    try:
        await websocket.send_text(json.dumps(message, ensure_ascii=False))
        return True
    except Exception as e:
        logger.error(f"WebSocket 메시지 전송 실패: {e}")
        return False

@app.websocket("/ws/terminal")
async def websocket_terminal_endpoint(websocket: WebSocket):
    """터미널 WebSocket 엔드포인트"""
    await websocket.accept()
    session = TerminalSession()
    
    # 연결 환영 메시지
    welcome_message = {
        "type": "connection",
        "status": "connected",
        "message": "터미널에 연결되었습니다. /help를 입력하여 사용법을 확인하세요.",
        "mode": session.mode.value
    }
    if not await safe_send_message(websocket, welcome_message):
        return
    
    try:
        while True:
            # 메시지 수신
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
            except json.JSONDecodeError:
                error_response = {
                    "type": "error",
                    "message": "잘못된 JSON 형식입니다."
                }
                await safe_send_message(websocket, error_response)
                continue
            except Exception as e:
                error_response = {
                    "type": "error", 
                    "message": f"메시지 수신 오류: {str(e)}"
                }
                await safe_send_message(websocket, error_response)
                continue
            
            # 필수 필드 확인
            if "type" not in message:
                error_response = {
                    "type": "error",
                    "message": "'type' 필드가 필요합니다."
                }
                await safe_send_message(websocket, error_response)
                continue
            
            message_type = message.get("type")
            text = message.get("text", "")
            
            # 메시지 타입별 처리
            if message_type == "translate":
                # 번역 요청 처리
                if not text.strip():
                    response = {
                        "type": "translation",
                        "success": False,
                        "error": "빈 텍스트는 번역할 수 없습니다."
                    }
                else:
                    # 모드 설정
                    request_mode = message.get("mode", "auto")
                    if request_mode == "session":
                        mode = session.mode
                    else:
                        mode = TranslationMode(request_mode) if request_mode in ["auto", "korean", "russian"] else session.mode
                    
                    # 번역 처리
                    translation_result = await process_terminal_translation(text, mode)
                    
                    if translation_result["success"]:
                        formatted_response = format_terminal_response(
                            translation_result, 
                            typing_animation=True
                        )
                        response = {
                            "type": "translation",
                            "success": True,
                            "data": formatted_response,
                            "original": translation_result.get("original"),
                            "translation": translation_result.get("translation")
                        }
                        session.update_stats("translation")
                    else:
                        response = {
                            "type": "translation", 
                            "success": False,
                            "error": translation_result.get("error", "번역 실패")
                        }
                
                await safe_send_message(websocket, response)
            
            elif message_type == "command":
                # 명령어 처리
                command_result = parse_terminal_command(text)
                
                if command_result is None:
                    response = {
                        "type": "command_result",
                        "success": False,
                        "error": "명령어가 아닙니다. '/'로 시작해야 합니다."
                    }
                elif command_result["type"] == "invalid":
                    response = {
                        "type": "command_result",
                        "success": False,
                        "error": command_result["error"]
                    }
                else:
                    # 유효한 명령어 처리
                    if command_result["type"] == "help":
                        formatted_response = format_terminal_response(None, command_type="help")
                    elif command_result["type"] == "clear":
                        formatted_response = format_terminal_response(None, command_type="clear")
                    elif command_result["type"] == "mode":
                        new_mode = command_result["mode"]
                        session.mode = TranslationMode(new_mode)
                        formatted_response = format_terminal_response(
                            None, 
                            command_type="mode_change", 
                            mode=new_mode
                        )
                    
                    response = {
                        "type": "command_result",
                        "success": True,
                        "data": formatted_response,
                        "command_type": command_result["type"]
                    }
                    session.update_stats("command")
                
                await safe_send_message(websocket, response)
            
            elif message_type == "get_stats":
                # 통계 정보 (향후 구현)
                response = {
                    "type": "stats",
                    "data": {
                        "translation_count": session.translation_count,
                        "command_count": session.command_count,
                        "current_mode": session.mode.value
                    }
                }
                await safe_send_message(websocket, response)
            
            else:
                # 지원되지 않는 메시지 타입
                response = {
                    "type": "error",
                    "message": f"지원되지 않는 메시지 타입: {message_type}"
                }
                await safe_send_message(websocket, response)
    
    except WebSocketDisconnect:
        logger.info("터미널 WebSocket 연결이 종료되었습니다")
    except Exception as e:
        logger.error(f"터미널 WebSocket 오류: {str(e)}")
        error_response = {
            "type": "error",
            "message": f"서버 오류: {str(e)}"
        }
        await safe_send_message(websocket, error_response)

# 채팅 관련 API 엔드포인트들

@app.get("/chat", response_class=HTMLResponse)
async def chat_interface(request: Request):
    """메신저 스타일 채팅 인터페이스 페이지"""
    return templates.TemplateResponse(
        "chat.html",
        {"request": request}
    )

@app.post("/api/chat/send", response_model=ChatResponse)
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

@app.get("/api/chat/sessions", response_model=SessionListResponse)
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

@app.get("/api/chat/sessions/{session_id}", response_model=ChatSession)
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

@app.delete("/api/chat/sessions/{session_id}")
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

@app.post("/api/chat/sessions/new", response_model=ChatResponse)
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

@app.get("/api/chat/stats")
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

@app.post("/api/bookmarks/create", response_model=BookmarkResponse)
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

@app.get("/api/bookmarks", response_model=BookmarkListResponse)
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

@app.get("/api/bookmarks/review", response_model=BookmarkListResponse)
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

@app.post("/api/bookmarks/{bookmark_id}/review")
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

@app.delete("/api/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str):
    """북마크 삭제"""
    try:
        success = bookmark_storage.delete_bookmark(bookmark_id)
        if not success:
            raise HTTPException(status_code=404, detail="북마크를 찾을 수 없습니다")
        
        return {"success": True, "message": f"북마크가 삭제되었습니다"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"북마크 삭제 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"북마크 삭제 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/bookmarks/search")
async def search_bookmarks(q: str, limit: int = 20):
    """북마크 텍스트 검색"""
    try:
        if not q.strip():
            return BookmarkListResponse(success=True, bookmarks=[], total_count=0)
        
        bookmarks = bookmark_storage.search_bookmarks(q)[:limit]
        return BookmarkListResponse(
            success=True,
            bookmarks=bookmarks,
            total_count=len(bookmarks)
        )
    except Exception as e:
        logger.error(f"북마크 검색 오류: {str(e)}")
        return BookmarkListResponse(
            success=False,
            error=f"북마크 검색 중 오류가 발생했습니다: {str(e)}"
        )

@app.get("/api/bookmarks/stats")
async def get_bookmark_stats():
    """북마크 통계 정보"""
    try:
        stats = bookmark_storage.get_bookmark_stats()
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        logger.error(f"북마크 통계 조회 오류: {str(e)}")
        return {
            "success": False,
            "error": f"북마크 통계를 불러올 수 없습니다: {str(e)}"
        }

@app.get("/api/bookmarks/session/{session_id}", response_model=BookmarkListResponse)
async def get_session_bookmarks(session_id: str):
    """특정 세션의 북마크들 반환"""
    try:
        bookmarks = bookmark_storage.get_bookmarks_by_session(session_id)
        return BookmarkListResponse(
            success=True,
            bookmarks=bookmarks,
            total_count=len(bookmarks)
        )
    except Exception as e:
        logger.error(f"세션 북마크 조회 오류: {str(e)}")
        return BookmarkListResponse(
            success=False,
            error=f"세션 북마크를 불러올 수 없습니다: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)