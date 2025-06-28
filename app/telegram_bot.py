import os
import asyncio
import logging
from typing import Dict, Any
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from .ai_service import generate_vocabulary_entry
from .models import VocabularyEntry

# 환경변수 로드
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 로깅 설정
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# 텔레그램 봇 토큰
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

class KoreanVocabBot:
    def __init__(self):
        self.application = None
        self.user_sessions: Dict[int, Dict[str, Any]] = {}
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Start 명령어 핸들러"""
        user = update.effective_user
        welcome_message = f"""안녕하세요 {user.first_name}님! 👋

🇰🇷 Korean Vocab Helper에 오신 것을 환영합니다!

저는 러시아인을 위한 한국어 어휘 학습 도우미입니다.

🔤 사용법:
• 한국어 단어를 입력하면 러시아어 번역과 예문을 제공합니다
• 맞춤법 오류가 있으면 자동으로 교정해드립니다
• 연인 관계에서 사용할 수 있는 자연스러운 예문을 생성합니다

💡 예시:
"안녕" → 러시아어 번역 + 발음 + 활용 예문 3개

📚 다른 명령어:
/help - 도움말 보기
/about - 봇 정보

지금 한국어 단어를 입력해보세요! ✨"""
        
        await update.message.reply_text(welcome_message)
        
        # 사용자 세션 초기화
        user_id = update.effective_user.id
        self.user_sessions[user_id] = {
            'last_word': None,
            'vocab_count': 0
        }
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Help 명령어 핸들러"""
        help_text = """🆘 도움말

🇰🇷 Korean Vocab Helper 사용법:

1️⃣ 기본 사용법:
   • 한국어 단어를 텍스트로 입력
   • 예: "사랑", "안녕", "고마워"

2️⃣ 제공 기능:
   ✅ 한국어 → 러시아어 번역
   ✅ 발음 표기 (로마자)
   ✅ 맞춤법 자동 교정
   ✅ 연인 관계 활용 예문 3개
   ✅ 문법 설명 (한국어 + 러시아어)

3️⃣ 명령어:
   /start - 봇 시작
   /help - 이 도움말
   /about - 봇 정보

💫 팁:
• 맞춤법이 틀려도 걱정마세요! 자동으로 교정됩니다
• 모든 예문은 연인 간 대화에서 자연스럽게 사용 가능합니다

궁금한 한국어 단어를 입력해보세요! 🎯"""
        
        await update.message.reply_text(help_text)
    
    async def about_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """About 명령어 핸들러"""
        about_text = """ℹ️ Korean Vocab Helper 정보

🤖 봇 이름: Korean Vocab Helper
📅 버전: 1.0.0
🎯 목적: 러시아인 한국어 학습 지원

🛠️ 기술 스택:
• Python 3.12
• python-telegram-bot 22.1
• PydanticAI + Google Gemini 2.5 Flash
• FastAPI 백엔드 연동

🌟 특징:
• AI 기반 번역 및 예문 생성
• 맞춤법 자동 교정
• 연인 관계 특화 예문
• 실시간 대화형 학습

💡 개발자: Korean Vocab App Team
🌐 웹 버전: https://korean-vocab-app.onrender.com

📝 피드백은 언제든 환영합니다!
즐거운 한국어 학습 되세요! 🇰🇷❤️🇷🇺"""
        
        await update.message.reply_text(about_text)
    
    async def translate_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """일반 텍스트 메시지 처리 - 한국어 번역"""
        user_id = update.effective_user.id
        korean_word = update.message.text.strip()
        
        # 세션 초기화 (필요시)
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = {
                'last_word': None,
                'vocab_count': 0
            }
        
        # 빈 메시지 체크
        if not korean_word:
            await update.message.reply_text("한국어 단어를 입력해주세요! 🤔")
            return
        
        # 처리 중 메시지
        processing_msg = await update.message.reply_text("🔄 번역 중입니다... 잠시만 기다려주세요!")
        
        try:
            # AI 서비스를 통한 어휘 생성
            vocab_entry: VocabularyEntry = await generate_vocabulary_entry(korean_word)
            
            # 세션 업데이트
            self.user_sessions[user_id]['last_word'] = vocab_entry.original_word
            self.user_sessions[user_id]['vocab_count'] += 1
            
            # 응답 메시지 구성
            response = self._format_vocabulary_response(vocab_entry, self.user_sessions[user_id]['vocab_count'])
            
            # 처리 중 메시지 삭제 후 결과 전송
            await processing_msg.delete()
            await update.message.reply_text(response, parse_mode='HTML')
            
        except Exception as e:
            logger.error(f"번역 처리 중 오류: {e}")
            await processing_msg.delete()
            await update.message.reply_text(
                f"⚠️ 번역 처리 중 오류가 발생했습니다.\n\n"
                f"🔄 다시 시도해주세요.\n"
                f"문제가 계속되면 /help를 확인해보세요."
            )
    
    def _format_vocabulary_response(self, vocab: VocabularyEntry, count: int) -> str:
        """어휘 응답을 텔레그램 메시지 형식으로 포맷팅"""
        
        # 맞춤법 검사 결과
        spelling_info = ""
        if vocab.spelling_check.has_spelling_error:
            spelling_info = f"""
✏️ <b>맞춤법 교정:</b>
   "{vocab.spelling_check.original_word}" → "{vocab.spelling_check.corrected_word}"
   💡 {vocab.spelling_check.correction_note}

"""
        
        # 기본 정보
        response = f"""🇰🇷 <b>한국어 단어 #{count}</b>

{spelling_info}<b>🔤 단어:</b> {vocab.original_word}
<b>🇷🇺 러시아어:</b> {vocab.russian_translation}
<b>🗣️ 발음:</b> {vocab.pronunciation}

<b>💬 활용 예문:</b>"""
        
        # 예문들 추가
        for i, example in enumerate(vocab.usage_examples, 1):
            response += f"""

<b>{i}. {example.korean_sentence}</b>
   🇷🇺 {example.russian_translation}
   📝 {example.grammar_note}
   📝🇷🇺 {example.grammar_note_russian}
   🎯 <i>{example.context}</i>"""
        
        # 마무리
        response += f"""

🌟 새로운 단어를 입력하거나 /help를 확인하세요!"""
        
        return response
    
    async def error_handler(self, update: object, context: ContextTypes.DEFAULT_TYPE):
        """에러 핸들러"""
        logger.error(f"Update {update} caused error {context.error}")
        
        if isinstance(update, Update) and update.effective_message:
            await update.effective_message.reply_text(
                "⚠️ 예상치 못한 오류가 발생했습니다.\n"
                "🔄 다시 시도해주세요.\n"
                "문제가 계속되면 /start로 재시작하세요."
            )
    
    def setup_handlers(self):
        """핸들러 등록"""
        if not self.application:
            return
        
        # 명령어 핸들러
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("about", self.about_command))
        
        # 메시지 핸들러 (일반 텍스트)
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.translate_message))
        
        # 에러 핸들러
        self.application.add_error_handler(self.error_handler)
    
    async def start_polling(self):
        """봇 polling 시작"""
        if not TELEGRAM_BOT_TOKEN:
            logger.error("TELEGRAM_BOT_TOKEN이 설정되지 않았습니다!")
            return
        
        # Application 생성
        self.application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
        
        # 핸들러 설정
        self.setup_handlers()
        
        logger.info("🤖 Korean Vocab Bot 시작중...")
        
        # 봇 정보 확인
        try:
            bot_info = await self.application.bot.get_me()
            logger.info(f"✅ 봇 연결 성공: @{bot_info.username}")
        except Exception as e:
            logger.error(f"❌ 봇 연결 실패: {e}")
            return
        
        # Polling 시작
        try:
            await self.application.initialize()
            await self.application.start()
            await self.application.updater.start_polling(drop_pending_updates=True)
            logger.info("🚀 Polling 시작됨. 봇이 메시지를 기다리고 있습니다...")
            
            # 무한 대기
            await asyncio.Event().wait()
            
        except KeyboardInterrupt:
            logger.info("🛑 봇 종료 중...")
        except Exception as e:
            logger.error(f"❌ Polling 오류: {e}")
        finally:
            await self.application.stop()
            await self.application.shutdown()

# 싱글톤 봇 인스턴스
bot_instance = KoreanVocabBot()

async def run_bot():
    """봇 실행 함수"""
    await bot_instance.start_polling()

if __name__ == "__main__":
    # 직접 실행시
    asyncio.run(run_bot())