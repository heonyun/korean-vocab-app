#!/usr/bin/env python3
"""
Korean Vocab Helper Telegram Bot 실행 스크립트

이 스크립트는 텔레그램 봇을 독립적으로 실행합니다.
웹 애플리케이션과 병렬로 실행 가능합니다.

사용법:
    python run_telegram_bot.py

또는 백그라운드 실행:
    python run_telegram_bot.py &

환경변수 필요:
    TELEGRAM_BOT_TOKEN - BotFather에서 받은 봇 토큰
    GOOGLE_API_KEY - Google Gemini API 키
"""

import asyncio
import os
import sys
import signal
import logging
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.telegram_bot import run_bot

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('telegram_bot.log', encoding='utf-8')
    ]
)

logger = logging.getLogger(__name__)

class BotRunner:
    def __init__(self):
        self.running = False
        self.setup_signal_handlers()
    
    def setup_signal_handlers(self):
        """시그널 핸들러 설정 (Ctrl+C 등)"""
        try:
            signal.signal(signal.SIGINT, self.signal_handler)
            signal.signal(signal.SIGTERM, self.signal_handler)
        except AttributeError:
            # Windows에서는 SIGTERM이 없을 수 있음
            signal.signal(signal.SIGINT, self.signal_handler)
    
    def signal_handler(self, signum, frame):
        """시그널 처리"""
        logger.info(f"🛑 시그널 {signum} 수신. 봇을 종료합니다...")
        self.running = False
    
    def check_environment(self):
        """환경변수 및 의존성 체크"""
        required_vars = ['TELEGRAM_BOT_TOKEN', 'GOOGLE_API_KEY']
        missing_vars = []
        
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            logger.error(f"❌ 필수 환경변수가 설정되지 않았습니다: {', '.join(missing_vars)}")
            logger.error("💡 .env 파일을 확인하거나 환경변수를 설정해주세요.")
            return False
        
        logger.info("✅ 환경변수 확인 완료")
        return True
    
    async def run(self):
        """봇 실행"""
        if not self.check_environment():
            return 1
        
        self.running = True
        
        try:
            logger.info("🚀 Korean Vocab Telegram Bot 시작중...")
            logger.info("📱 텔레그램에서 @Korean_vocab_helper_bot을 검색하세요!")
            logger.info("⏹️  종료하려면 Ctrl+C를 누르세요.")
            
            await run_bot()
            
        except KeyboardInterrupt:
            logger.info("🛑 사용자에 의해 종료되었습니다.")
        except Exception as e:
            logger.error(f"❌ 봇 실행 중 오류: {e}")
            return 1
        finally:
            logger.info("👋 Korean Vocab Bot이 종료되었습니다.")
        
        return 0

def main():
    """메인 함수"""
    print("=" * 60)
    print("🇰🇷 Korean Vocab Helper Telegram Bot")
    print("=" * 60)
    print()
    
    # .env 파일 로드 시도
    try:
        from dotenv import load_dotenv
        env_path = project_root / '.env'
        if env_path.exists():
            load_dotenv(env_path)
            print(f"✅ .env 파일 로드됨: {env_path}")
        else:
            print(f"⚠️  .env 파일이 없습니다: {env_path}")
    except ImportError:
        print("📝 python-dotenv가 설치되지 않음. 시스템 환경변수를 사용합니다.")
    
    print()
    
    # 봇 실행
    runner = BotRunner()
    
    try:
        exit_code = asyncio.run(runner.run())
        sys.exit(exit_code)
    except Exception as e:
        logger.error(f"❌ 예상치 못한 오류: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()