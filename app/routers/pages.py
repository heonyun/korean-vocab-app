from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/")
async def home(request: Request):
    """메인 페이지 - 채팅 인터페이스로 리다이렉트"""
    return RedirectResponse(url="/chat", status_code=302)

@router.get("/offline")
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

@router.get("/chat")
async def chat_interface(request: Request):
    """메신저 스타일 채팅 인터페이스 페이지"""
    return templates.TemplateResponse(
        "chat.html",
        {"request": request}
    )

@router.get("/terminal")
async def terminal_interface(request: Request):
    """터미널 인터페이스 페이지"""
    return templates.TemplateResponse(
        "terminal.html",
        {"request": request}
    )
