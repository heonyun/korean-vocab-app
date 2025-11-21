from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging

from ..terminal_service import (
    parse_terminal_command, 
    process_terminal_translation,
    format_terminal_response,
    TranslationMode
)

router = APIRouter()
logger = logging.getLogger(__name__)

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

@router.websocket("/ws/terminal")
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
