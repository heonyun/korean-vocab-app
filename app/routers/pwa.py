from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()

@router.get("/manifest.json")
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

@router.get("/sw.js")
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
