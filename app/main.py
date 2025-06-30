from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from typing import List
import logging
import os

from .models import VocabularyRequest, VocabularyResponse, VocabularyEntry
from .ai_service import generate_vocabulary_entry, generate_vocabulary_fallback
from .storage import storage

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="한국어 어휘 학습 노트",
    description="러시아인을 위한 한국어 어휘 학습 도구",
    version="0.1.6"
)

# 정적 파일 및 템플릿 설정
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """메인 페이지"""
    vocabulary_list = storage.load_all()
    return templates.TemplateResponse(
        "index.html", 
        {
            "request": request, 
            "vocabulary_count": len(vocabulary_list),
            "vocabulary_list": vocabulary_list[-10:]  # 최근 10개만 표시
        }
    )

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

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)