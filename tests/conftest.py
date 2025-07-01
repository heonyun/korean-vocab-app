"""
테스트 설정 파일
"""
import pytest
import asyncio
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

@pytest.fixture
def client():
    """FastAPI 테스트 클라이언트"""
    return TestClient(app)

@pytest.fixture
def event_loop():
    """asyncio 이벤트 루프 설정"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def sample_korean_words():
    """테스트용 한국어 단어 샘플"""
    return {
        "correct": ["사랑", "행복", "친구", "가족"],
        "incorrect": ["사량", "행복함", "친구들이", "가쪽"],
        "mixed": ["사랑해", "행복하다", "친구야", "가족들"]
    }

@pytest.fixture
def sample_russian_words():
    """테스트용 러시아어 단어 샘플"""
    return ["любовь", "счастье", "друг", "семья"]

@pytest.fixture
def sample_terminal_commands():
    """테스트용 터미널 명령어 샘플"""
    return {
        "valid": ["/help", "/clear", "/mode korean", "/mode russian", "/mode auto"],
        "invalid": ["/unknown", "/mode invalid", "/help extra", "help"]
    }