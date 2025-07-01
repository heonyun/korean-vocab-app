"""
터미널 명령어 시스템 테스트
"""
import pytest
from app.terminal_service import parse_terminal_command, format_terminal_response

class TestCommandParsing:
    """명령어 파싱 테스트"""
    
    def test_help_command(self):
        """도움말 명령어 테스트"""
        result = parse_terminal_command("/help")
        assert result is not None
        assert result["type"] == "help"
        assert result["args"] == []
    
    def test_clear_command(self):
        """화면 지우기 명령어 테스트"""
        result = parse_terminal_command("/clear")
        assert result is not None
        assert result["type"] == "clear"
        assert result["args"] == []
    
    def test_mode_commands(self, sample_terminal_commands):
        """모드 변경 명령어 테스트"""
        # 유효한 모드 명령어들
        for command in ["/mode korean", "/mode russian", "/mode auto"]:
            result = parse_terminal_command(command)
            assert result is not None
            assert result["type"] == "mode"
            assert result["mode"] in ["korean", "russian", "auto"]
        
        # 무효한 모드 명령어
        result = parse_terminal_command("/mode invalid")
        assert result is not None
        assert result["type"] == "invalid"
        assert "올바른 모드" in result["error"]
    
    def test_invalid_commands(self):
        """무효한 명령어 테스트"""
        invalid_commands = ["/unknown", "/help extra args", "/mode", "/mode too many args"]
        
        for command in invalid_commands[:2]:  # /unknown, /help extra args
            result = parse_terminal_command(command)
            assert result is not None
            assert result["type"] == "invalid"
        
        # /mode (인자 없음)
        result = parse_terminal_command("/mode")
        assert result is not None
        assert result["type"] == "invalid"
    
    def test_non_command_input(self):
        """명령어가 아닌 입력 테스트"""
        non_commands = ["hello", "안녕하세요", "help", "mode korean"]
        
        for text in non_commands:
            result = parse_terminal_command(text)
            assert result is None
    
    def test_command_with_whitespace(self):
        """공백이 포함된 명령어 테스트"""
        # 앞뒤 공백 처리
        result = parse_terminal_command("  /help  ")
        assert result is not None
        assert result["type"] == "help"
        
        # 명령어 내부 공백 처리
        result = parse_terminal_command("/mode   korean")
        assert result is not None
        assert result["type"] == "mode"
        assert result["mode"] == "korean"

class TestCommandExecution:
    """명령어 실행 테스트"""
    
    def test_help_command_execution(self):
        """도움말 명령어 실행 테스트"""
        result = format_terminal_response(None, command_type="help")
        
        # 필수 도움말 내용 확인
        assert "/help" in result
        assert "/clear" in result
        assert "/mode" in result
        assert "터미널 명령어" in result or "사용법" in result
    
    def test_clear_command_execution(self):
        """화면 지우기 명령어 실행 테스트"""
        # clear 명령어는 클라이언트 측에서 처리되므로 특별한 응답 형식이 필요
        result = format_terminal_response(None, command_type="clear")
        
        # 클리어 확인 메시지 또는 특수 마커
        assert "{{CLEAR_SCREEN}}" in result or "화면이 지워졌습니다" in result
    
    def test_mode_change_confirmation(self):
        """모드 변경 확인 메시지 테스트"""
        modes = ["korean", "russian", "auto"]
        
        for mode in modes:
            result = format_terminal_response(None, command_type="mode_change", mode=mode)
            assert mode in result.lower()
            assert "모드" in result

class TestCommandValidation:
    """명령어 유효성 검증 테스트"""
    
    def test_command_case_sensitivity(self):
        """명령어 대소문자 구분 테스트"""
        # 소문자만 유효해야 함
        result = parse_terminal_command("/HELP")
        assert result is not None
        assert result["type"] == "invalid"
        
        result = parse_terminal_command("/Help")
        assert result is not None
        assert result["type"] == "invalid"
        
        # 소문자는 유효
        result = parse_terminal_command("/help")
        assert result is not None
        assert result["type"] == "help"
    
    def test_command_length_limits(self):
        """명령어 길이 제한 테스트"""
        # 너무 긴 명령어
        long_command = "/" + "a" * 100
        result = parse_terminal_command(long_command)
        assert result is not None
        assert result["type"] == "invalid"
    
    def test_special_characters_in_commands(self):
        """명령어의 특수문자 처리 테스트"""
        special_commands = ["/help!", "/clear#", "/mode@korean"]
        
        for command in special_commands:
            result = parse_terminal_command(command)
            assert result is not None
            assert result["type"] == "invalid"

class TestCommandHistory:
    """명령어 히스토리 테스트 (향후 구현 대비)"""
    
    def test_history_command_placeholder(self):
        """히스토리 명령어 placeholder 테스트"""
        # 향후 /history 명령어 구현을 위한 테스트
        result = parse_terminal_command("/history")
        # 현재는 invalid이지만 향후 구현 예정
        assert result is not None
        assert result["type"] == "invalid"
    
    def test_stats_command_placeholder(self):
        """통계 명령어 placeholder 테스트"""
        # 향후 /stats 명령어 구현을 위한 테스트
        result = parse_terminal_command("/stats")
        # 현재는 invalid이지만 향후 구현 예정
        assert result is not None
        assert result["type"] == "invalid"