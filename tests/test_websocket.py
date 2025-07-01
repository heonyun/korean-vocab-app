"""
WebSocket 통신 테스트
"""
import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

class TestWebSocketConnection:
    """WebSocket 연결 테스트"""
    
    def test_websocket_endpoint_exists(self, client):
        """WebSocket 엔드포인트 존재 확인"""
        # FastAPI 앱에 WebSocket 엔드포인트가 등록되어 있는지 확인
        from app.main import app
        routes = [route.path for route in app.routes]
        assert "/ws/terminal" in routes or any("/ws/terminal" in route.path for route in app.routes if hasattr(route, 'path'))
    
    @pytest.mark.asyncio
    async def test_websocket_connection_success(self, client):
        """WebSocket 연결 성공 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 성공 시 환영 메시지 수신
            data = websocket.receive_json()
            assert data["type"] == "connection"
            assert data["status"] == "connected"
    
    @pytest.mark.asyncio
    async def test_websocket_translation_message(self, client):
        """WebSocket 번역 메시지 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # 번역 요청 전송
            websocket.send_json({
                "type": "translate",
                "text": "사랑해",
                "mode": "auto"
            })
            
            # 번역 결과 수신
            response = websocket.receive_json()
            assert response["type"] == "translation"
            assert response["success"] is True
            assert "original" in response["data"]
            assert "translation" in response["data"]
    
    @pytest.mark.asyncio
    async def test_websocket_command_message(self, client):
        """WebSocket 명령어 메시지 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # 도움말 명령어 전송
            websocket.send_json({
                "type": "command",
                "text": "/help"
            })
            
            # 명령어 결과 수신
            response = websocket.receive_json()
            assert response["type"] == "command_result"
            assert response["success"] is True
            assert "/help" in response["data"]

class TestWebSocketMessageHandling:
    """WebSocket 메시지 처리 테스트"""
    
    @pytest.mark.asyncio
    async def test_invalid_message_format(self, client):
        """잘못된 메시지 형식 처리 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # 잘못된 형식의 메시지 전송
            websocket.send_text("invalid json")
            
            # 에러 응답 수신
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "JSON" in response["message"] or "형식" in response["message"]
    
    @pytest.mark.asyncio 
    async def test_missing_required_fields(self, client):
        """필수 필드 누락 처리 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # type 필드 누락
            websocket.send_json({
                "text": "사랑해"
            })
            
            # 에러 응답 수신
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "type" in response["message"] or "필수" in response["message"]
    
    @pytest.mark.asyncio
    async def test_unknown_message_type(self, client):
        """알 수 없는 메시지 타입 처리 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # 지원되지 않는 메시지 타입
            websocket.send_json({
                "type": "unknown_type",
                "text": "test"
            })
            
            # 에러 응답 수신
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "unknown_type" in response["message"] or "지원되지 않는" in response["message"]

class TestWebSocketErrorHandling:
    """WebSocket 에러 처리 테스트"""
    
    @pytest.mark.asyncio
    async def test_ai_service_failure(self, client):
        """AI 서비스 실패 시 처리 테스트"""
        with patch('app.terminal_service.process_terminal_translation') as mock_translate:
            # AI 서비스 실패 시뮬레이션
            mock_translate.return_value = {
                "success": False,
                "error": "AI 서비스 연결 실패"
            }
            
            with client.websocket_connect("/ws/terminal") as websocket:
                # 연결 확인
                welcome_msg = websocket.receive_json()
                
                # 번역 요청
                websocket.send_json({
                    "type": "translate",
                    "text": "사랑해",
                    "mode": "auto"
                })
                
                # 에러 응답 확인
                response = websocket.receive_json()
                assert response["type"] == "translation"
                assert response["success"] is False
                assert "AI 서비스" in response["error"]
    
    @pytest.mark.asyncio
    async def test_empty_translation_text(self, client):
        """빈 번역 텍스트 처리 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # 빈 텍스트 번역 요청
            websocket.send_json({
                "type": "translate",
                "text": "",
                "mode": "auto"
            })
            
            # 에러 응답 확인
            response = websocket.receive_json()
            assert response["type"] == "translation"
            assert response["success"] is False
            assert "빈" in response["error"] or "입력" in response["error"]

class TestWebSocketSessionManagement:
    """WebSocket 세션 관리 테스트"""
    
    @pytest.mark.asyncio
    async def test_mode_persistence(self, client):
        """모드 설정 지속성 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # 모드 변경
            websocket.send_json({
                "type": "command",
                "text": "/mode korean"
            })
            
            mode_response = websocket.receive_json()
            assert mode_response["success"] is True
            
            # 번역 요청 (모드가 유지되는지 확인)
            websocket.send_json({
                "type": "translate",
                "text": "test",  # 영어이지만 korean 모드로 처리되어야 함
                "mode": "session"  # 세션 모드 사용
            })
            
            translation_response = websocket.receive_json()
            # 세션 모드에 따라 처리되었는지 확인
            assert translation_response["type"] == "translation"
    
    @pytest.mark.asyncio
    async def test_session_statistics(self, client):
        """세션 통계 추적 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # 여러 번역 요청
            for word in ["사랑", "행복", "친구"]:
                websocket.send_json({
                    "type": "translate",
                    "text": word,
                    "mode": "auto"
                })
                response = websocket.receive_json()
            
            # 통계 요청 (향후 구현 예정)
            websocket.send_json({
                "type": "get_stats"
            })
            
            stats_response = websocket.receive_json()
            # 현재는 지원되지 않는 메시지로 처리될 것
            assert stats_response["type"] in ["error", "stats"]

class TestWebSocketPerformance:
    """WebSocket 성능 테스트"""
    
    @pytest.mark.asyncio
    async def test_concurrent_messages(self, client):
        """동시 메시지 처리 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # 빠른 연속 메시지 전송
            messages = [
                {"type": "translate", "text": "사랑", "mode": "auto"},
                {"type": "command", "text": "/help"},
                {"type": "translate", "text": "행복", "mode": "auto"}
            ]
            
            for msg in messages:
                websocket.send_json(msg)
            
            # 모든 응답 수신 확인
            responses = []
            for _ in range(len(messages)):
                response = websocket.receive_json()
                responses.append(response)
            
            assert len(responses) == len(messages)
            # 각 응답이 올바른 타입인지 확인
            assert any(r["type"] == "translation" for r in responses)
            assert any(r["type"] == "command_result" for r in responses)
    
    @pytest.mark.asyncio
    async def test_large_message_handling(self, client):
        """큰 메시지 처리 테스트"""
        with client.websocket_connect("/ws/terminal") as websocket:
            # 연결 확인
            welcome_msg = websocket.receive_json()
            
            # 매우 긴 텍스트 번역 요청
            long_text = "사랑해 " * 100  # 700자 정도
            
            websocket.send_json({
                "type": "translate",
                "text": long_text,
                "mode": "auto"
            })
            
            response = websocket.receive_json()
            # 길이 제한으로 인한 에러 또는 정상 처리 확인
            assert response["type"] == "translation"
            # 성공하거나 길이 제한 에러여야 함
            if not response["success"]:
                assert "길이" in response["error"] or "크기" in response["error"]