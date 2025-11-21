from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import logging

from .routers import pages, vocabulary, chat, terminal, pwa

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="한국어 어휘 학습 노트",
    description="러시아인을 위한 한국어 어휘 학습 도구",
    version="0.1.6"
)

# 정적 파일 설정
app.mount("/static", StaticFiles(directory="static"), name="static")

# 라우터 포함
app.include_router(pages.router)
app.include_router(vocabulary.router)
app.include_router(chat.router)
app.include_router(terminal.router)
app.include_router(pwa.router)

@app.get("/health")
async def health_check():
    """서버 상태 확인"""
    return {"status": "healthy", "message": "한국어 어휘 학습 노트 서버 정상 동작중"}