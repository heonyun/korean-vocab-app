# Korean Vocabulary Learning App - Claude Desktop Project

## 프로젝트 개요

Korean Vocabulary Learning App은 러시아인을 위한 AI 기반 한국어 어휘 학습 도구입니다. **HTMX + Tailwind CSS + Google Gemini AI**를 활용하여 현대적이고 반응성 높은 사용자 인터페이스와 함께 한국어 단어를 러시아어로 번역하고 실용적인 예문을 제공하는 웹 애플리케이션과 텔레그램 봇을 통합한 프로젝트입니다.

## 핵심 목표

- **최신 웹 기술 활용**: HTMX를 통한 SPA 같은 경험과 Tailwind CSS로 현대적 UI 구현
- **AI 기반 개인 맞춤형 학습**: Google Gemini 2.5 Flash를 활용한 정확한 번역과 실용적 예문 생성
- **다중 플랫폼 지원**: 웹 애플리케이션과 텔레그램 봇을 통한 접근성 극대화
- **실시간 학습 환경**: 즉시 번역과 음성 재생을 통한 몰입감 있는 학습 경험
- **Progressive Web App**: 모바일 앱과 같은 사용자 경험 제공

## 서비스 설명

### 🌐 웹 애플리케이션 (HTMX + Tailwind CSS)
**라이브 URL**: https://korean-vocab-app.onrender.com  
**로컬 테스트 URL**: `http://172.26.174.167:8001` (WSL IP에서 포트 8001로 실행)

**최신 기술 스택**:
- **HTMX 1.9.10**: JavaScript 없이 AJAX, WebSocket, Server-Sent Events 구현
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크로 빠른 스타일링
- **다크모드**: Tailwind 네이티브 다크모드 지원 (`class` 전략)
- **반응형 디자인**: 모든 디바이스에서 최적화된 경험

**주요 기능**:
- 한국어 단어 입력 → Google Gemini가 러시아어 번역 + 발음 + 3개 활용 예제 자동 생성
- **실시간 입력 검증**: HTMX를 통한 즉시 입력 유효성 검사
- **무새로고침 UX**: HTMX로 페이지 새로고침 없이 모든 기능 사용
- 브라우저 TTS를 활용한 한국어 발음 듣기 기능
- 학습한 어휘 자동 저장 및 개인 노트 관리
- 연인 관계에서 사용할 수 있는 실용적 예문 제공
- PWA 지원으로 홈화면 설치 가능
- **다크모드**: 시스템 테마 감지 + 수동 토글
- 오프라인 모드 지원
- 다양한 브라우저 완벽 호환

### 🤖 텔레그램 봇
**봇 URL**: https://t.me/Korean_vocab_helper_bot

**주요 기능**:
- 메시지로 한국어 단어 전송 → 즉시 러시아어 번역 + 예문 3개 응답
- 틀린 철자 자동 교정 후 올바른 단어로 학습
- 개인별 학습 진도 및 어휘 카운트 관리
- `/start`, `/help`, `/about` 등 친화적 인터페이스
- 실시간 AI 응답 및 포괄적 에러 처리

## 기술 스택

### 프론트엔드 (최신 버전)
- **HTMX 1.9.10**: 하이퍼미디어 기반 인터랙션 (CDN)
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크 (CDN)
- **다크모드**: Tailwind 네이티브 `class` 전략
- **바닐라 JavaScript**: 음성 기능, PWA, 테마 관리

### 백엔드
- **FastAPI**: Python 웹 프레임워크
- **PydanticAI 0.3.1**: 타입 안전한 AI 에이전트
- **Google Gemini 2.5 Flash Experimental**: AI 번역 및 예문 생성

### 기타
- **PWA**: Service Worker + Web App Manifest
- **저장소**: JSON 파일 기반 로컬 저장
- **배포**: Render (무료 호스팅)
- **텔레그램 봇**: python-telegram-bot 22.1 (Polling 방식)
- **개발 환경**: Python 3.12, WSL Ubuntu 24.04.2

## 프로젝트 구조

```
korean-vocab-app/                    # 프로젝트 루트
├── README.md                        # 프로젝트 설명서
├── PROJECT_ROADMAP.md               # 개발 로드맵
├── requirements.txt                 # Python 패키지 의존성
├── render.yaml                      # Render 배포 설정
├── run.py                          # 웹 앱 실행 스크립트
├── run_telegram_bot.py             # 텔레그램 봇 실행 스크립트
├── vocabulary_data.json            # 어휘 데이터 저장 파일 (자동 생성)
│
├── app/                            # 메인 애플리케이션
│   ├── __init__.py
│   ├── main.py                     # FastAPI 메인 앱 (HTMX 엔드포인트 포함)
│   ├── models.py                   # Pydantic 모델 정의
│   ├── ai_service.py               # Gemini AI 연동 서비스
│   ├── storage.py                  # JSON 파일 저장소 관리
│   └── telegram_bot.py             # 텔레그램 봇 로직
│
├── static/                         # 프론트엔드 정적 파일
│   ├── style.css                   # 기존 스타일 (Tailwind와 함께 사용)
│   ├── script.js                   # 프론트엔드 JavaScript
│   ├── manifest.json               # PWA 매니페스트
│   ├── sw.js                       # Service Worker
│   └── icons/                      # PWA 아이콘들
│       ├── favicon-16.png
│       ├── favicon-32.png
│       ├── icon-*.png              # 다양한 크기의 앱 아이콘
│
├── templates/                      # HTML 템플릿 (HTMX 활용)
│   ├── index.html                  # 메인 페이지 (HTMX + Tailwind)
│   └── partials/                   # HTMX 컴포넌트
│       ├── error.html              # 에러 메시지 파티셜
│       ├── notification.html       # 알림 파티셜
│       ├── validation_message.html # 입력 검증 파티셜
│       ├── vocabulary_card.html    # 어휘 카드 파티셜
│       └── vocabulary_list.html    # 어휘 목록 파티셜
│
└── github_issues/                  # GitHub 이슈 관리
    ├── issue1.md
    ├── issue2.md
    ├── issue3.md
    └── issue4.md
```

## GitHub 저장소

**저장소 URL**: https://github.com/heonyun/korean-vocab-app
- **소유자**: heonyun
- **저장소 유형**: Private
- **라이선스**: MIT License
- **자동 배포**: GitHub → Render CI/CD 파이프라인 구축

## 개발 환경 설정

### 로컬 실행 방법
```bash
# 1. 저장소 복제
git clone https://github.com/heonyun/korean-vocab-app.git
cd korean-vocab-app

# 2. 가상환경 설정
python3 -m venv korean-vocab-env
source korean-vocab-env/bin/activate

# 3. 패키지 설치
pip install -r requirements.txt

# 4. 환경변수 설정 (.env 파일)
GOOGLE_API_KEY=your_google_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# 5. 웹 앱 실행 (포트 충돌 피하기)
PORT=8001 python run.py

# 6. 텔레그램 봇 실행 (별도 터미널)
python run_telegram_bot.py
```

### WSL + Windows 접속 방법
- **WSL 내부**: `http://localhost:8001` (터미널에서만)
- **Windows 브라우저**: `http://172.26.174.167:8001` (크롬/엣지에서)
- **WSL IP 확인**: `hostname -I | cut -d' ' -f1`

### API 엔드포인트

#### 기존 REST API
- `GET /`: 메인 페이지
- `POST /api/generate-vocabulary`: 어휘 생성
- `GET /api/vocabulary`: 모든 어휘 목록
- `GET /api/vocabulary/{word}`: 특정 어휘 조회
- `DELETE /api/vocabulary/{word}`: 어휘 삭제
- `GET /health`: 서버 상태 확인

#### HTMX 전용 엔드포인트
- `POST /htmx/generate-vocabulary`: HTMX 어휘 생성
- `GET /htmx/vocabulary-list`: HTMX 어휘 목록
- `POST /htmx/validate-input`: HTMX 실시간 입력 검증
- `DELETE /htmx/vocabulary/{word}`: HTMX 어휘 삭제

## HTMX 주요 기능

### 실시간 입력 검증
```html
<input hx-post="/htmx/validate-input"
       hx-trigger="input changed delay:500ms"
       hx-target="#input-validation">
```

### 무새로고침 폼 제출
```html
<form hx-post="/htmx/generate-vocabulary"
      hx-target="#vocabulary-result"
      hx-indicator="#loading">
```

### 동적 콘텐츠 로딩
```html
<div hx-get="/htmx/vocabulary-list"
     hx-trigger="load">
```

## Tailwind CSS 커스터마이징

```javascript
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f4ff',
                    500: '#667eea',
                    600: '#5a6fd8',
                    700: '#4c63d2'
                }
            }
        }
    }
}
```

## 개발 로드맵

### Phase 1: HTMX + Tailwind 변환 (완료 ✅)
- ✅ HTMX 1.9.10 통합
- ✅ Tailwind CSS 도입
- ✅ 다크모드 네이티브 지원
- ✅ 실시간 입력 검증
- ✅ 무새로고침 UX 구현

### Phase 2: 음성 기능 확장
- 🔄 활용 예제별 음성 재생 버튼
- 🔄 음성 재생 속도 조절
- 🔄 음성 상태 피드백 개선

### Phase 3: UI/UX 개선
- 🔄 애니메이션 및 전환 효과 (Tailwind 애니메이션)
- 🔄 접근성 (a11y) 개선
- 🔄 터치 최적화

### Phase 4: 학습 추적 시스템
- 📋 학습 통계 대시보드
- 📋 일일 학습 목표 설정
- 📋 학습 스트릭 시스템

## 조사 및 기획 과제

### 기술적 조사 과제
1. **HTMX 최적화**: SSE(Server-Sent Events) 활용한 실시간 알림 시스템 연구
2. **Tailwind 최적화**: PurgeCSS 설정으로 번들 크기 최적화 방안
3. **PWA 최적화**: Lighthouse 점수 90+ 달성을 위한 성능 최적화 방안 연구
4. **하이브리드 아키텍처**: HTMX + 일부 React 컴포넌트 혼용 가능성 검토

### 사용자 경험 조사
1. **HTMX UX 분석**: 기존 SPA vs HTMX 방식의 사용자 만족도 비교
2. **다크모드 사용성**: Tailwind 다크모드의 시각적 일관성 검증
3. **모바일 반응성**: Tailwind 반응형 클래스 활용도 분석
4. **접근성 개선**: HTMX와 스크린 리더 호환성 테스트

### 기술 스택 진화 연구
1. **Alpine.js 도입**: HTMX와 Alpine.js 조합의 효과성 분석
2. **Tailwind Components**: Headless UI, Radix UI 등과의 통합 방안
3. **Build Tools**: Vite, esbuild 등 모던 빌드 도구 도입 검토
4. **CSS-in-JS 대안**: Tailwind의 장기적 유지보수성 분석

## 테스트 계획

### 기능 테스트
- **HTMX 인터랙션**: 모든 HTMX 엔드포인트 정상 동작 검증
- **다크모드 전환**: Tailwind 다크모드 완전 동작 테스트
- **실시간 검증**: 입력 검증의 응답 속도 및 정확도 테스트
- **오프라인 PWA**: Service Worker와 HTMX 호환성 검증

### 성능 테스트
- **페이지 로드 시간**: Tailwind CSS 로딩 최적화 효과 측정
- **HTMX 응답 속도**: 서버 사이드 렌더링 vs 클라이언트 렌더링 비교
- **번들 크기**: Tailwind 미사용 클래스 제거 후 크기 측정
- **메모리 사용량**: HTMX DOM 조작의 메모리 효율성 검증

### 사용자 경험 테스트
- **UI 일관성**: 다크/라이트 모드에서의 시각적 통일성
- **터치 반응성**: 모바일에서 Tailwind 유틸리티 클래스 효과성
- **접근성**: HTMX 동적 콘텐츠의 스크린 리더 호환성
- **브라우저 호환성**: 다양한 브라우저에서 HTMX + Tailwind 동작 확인

## 성공 지표

### 기술적 지표
- Lighthouse PWA 점수: 90+
- 페이지 로드 시간: 2초 이하
- HTMX 응답 시간: 500ms 이하
- Tailwind CSS 번들 크기: 50KB 이하

### 사용자 지표
- 모바일 PWA 설치율: 70%+
- 다크모드 사용률: 40%+
- 세션 시간: 평균 5분+
- 사용자 만족도: 4.5/5.0+

## 여자친구 테스트 가이드

### 로컬 테스트 방법
1. **브라우저 접속**: `http://172.26.174.167:8001`
2. **기본 기능 테스트**:
   - 한국어 단어 입력 (예: "사랑해")
   - 실시간 입력 검증 확인
   - "생성하기" 버튼 클릭
   - 결과 확인 (번역 + 예문 3개)
   - 🔊 버튼으로 발음 듣기

3. **HTMX 기능 테스트**:
   - 페이지 새로고침 없이 모든 기능 작동 확인
   - 실시간 입력 검증 (올바른/틀린 단어 구분)
   - 어휘 목록 동적 업데이트

4. **다크모드 테스트**:
   - 🌙 버튼으로 다크모드 전환
   - 모든 UI 요소의 색상 변화 확인
   - 시스템 테마 감지 동작

5. **PWA 테스트**:
   - 홈화면에 추가 프롬프트 확인
   - 설치 후 앱 아이콘으로 실행
   - 오프라인에서 저장된 어휘 확인

### 텔레그램 봇 테스트
1. **봇 접속**: @Korean_vocab_helper_bot
2. **기본 명령어**: `/start`, `/help`, `/about`
3. **어휘 학습**: 한국어 단어 메시지 전송
4. **진도 확인**: 학습 카운트 증가 확인

## 추가 리소스

- **배포 URL**: https://korean-vocab-app.onrender.com
- **로컬 테스트**: http://172.26.174.167:8001
- **텔레그램 봇**: @Korean_vocab_helper_bot
- **GitHub 저장소**: https://github.com/heonyun/korean-vocab-app
- **기술 문서**: /README.md, /PROJECT_ROADMAP.md
- **개발 환경**: WSL Ubuntu 24.04.2 + Python 3.12

---

**업데이트 날짜**: 2025-07-01  
**Claude Desktop 프로젝트 버전**: 2.0 (HTMX + Tailwind)  
**담당자**: Claude Code AI Assistant