#!/usr/bin/env python3
import uvicorn
import os
import sys

# 현재 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 한국어 어휘 학습 노트 앱을 시작합니다...")
    print("📝 서버 주소: http://localhost:8000")
    print("🔑 Google API 키가 필요합니다. 환경변수 GOOGLE_API_KEY를 설정해주세요.")
    print("-" * 50)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )