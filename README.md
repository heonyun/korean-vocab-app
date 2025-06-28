# 한국어 어휘 학습 노트 📚

> 러시아인을 위한 AI 기반 한국어 어휘 학습 도구

[![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7.svg)](https://render.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🌟 주요 기능

### 🌐 웹 애플리케이션
- 🤖 **AI 어휘 생성**: 한국어 단어 입력 → Google Gemini가 자동으로 러시아어 번역 + 발음 + 3개 활용 예제 생성
- 🔊 **음성 재생**: 브라우저 TTS를 활용한 한국어 발음 듣기  
- 💾 **개인 노트**: 학습한 어휘 자동 저장 및 관리
- 💕 **연인 맞춤**: 연인 관계에서 사용할 수 있는 실용적 예문 제공
- 📱 **PWA 지원**: 홈화면에 설치 가능한 Progressive Web App
- 🌙 **다크모드**: 사용자 선호에 따른 테마 전환
- 📴 **오프라인 모드**: 네트워크 없이도 저장된 어휘 확인 가능
- 🌐 **브라우저 호환성**: Chrome, Firefox, Safari, Samsung Internet 완벽 지원

### 🤖 텔레그램 봇 (NEW!)
- 📱 **@Korean_vocab_helper_bot**: 텔레그램에서 바로 사용 가능한 한국어 학습 봇
- 💬 **실시간 번역**: 메시지로 한국어 단어 전송 → 즉시 러시아어 번역 + 예문 3개 
- ✏️ **맞춤법 교정**: 틀린 철자 자동 교정 후 올바른 단어로 학습
- 📊 **학습 추적**: 개인별 학습 진도 및 어휘 카운트 관리
- 🎯 **명령어 지원**: `/start`, `/help`, `/about` 등 친화적 인터페이스

## 🛠️ 기술 스택

- **Backend**: FastAPI + PydanticAI
- **AI**: Google Gemini 2.5 Flash Experimental
- **Frontend**: HTML/CSS/JavaScript (바닐라)
- **PWA**: Service Worker + Web App Manifest
- **저장소**: JSON 파일 (로컬 저장)
- **배포**: Render (무료 호스팅)
- **텔레그램 봇**: python-telegram-bot 22.1 (Polling 방식)

## 🚀 빠른 시작

### 🌐 웹 애플리케이션 (권장)
🌐 **[여기를 클릭해서 바로 사용하세요!](https://korean-vocab-app.onrender.com)**

### 🤖 텔레그램 봇 (즉시 사용)
📱 텔레그램에서 **[@Korean_vocab_helper_bot](https://t.me/Korean_vocab_helper_bot)** 검색 후 `/start` 명령어 입력

> **사용법**: 한국어 단어를 메시지로 보내면 즉시 러시아어 번역 + 예문을 받을 수 있습니다!

### 💻 로컬 설치 및 실행

#### 1. 저장소 복제
```bash
git clone https://github.com/heonyun/korean-vocab-app.git
cd korean-vocab-app
```

#### 2. 가상환경 설정
```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

#### 3. 패키지 설치
```bash
pip install -r requirements.txt
```

#### 4. 환경변수 설정
```bash
# .env 파일 생성
cp .env.example .env

# .env 파일에 API 키 입력
GOOGLE_API_KEY=your_google_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here  # 텔레그램 봇 실행시에만 필요
```

#### 5. 앱 실행

##### 웹 애플리케이션 실행:
```bash
python run.py
```
브라우저에서 http://localhost:8000 접속

##### 텔레그램 봇 실행 (선택사항):
```bash
# 별도 터미널에서 실행
python run_telegram_bot.py
```
텔레그램에서 봇과 대화 가능

## 📱 사용법

### 기본 사용
1. 메인 페이지에서 한국어 단어 입력 (예: "사랑해")
2. "생성하기" 버튼 클릭
3. AI가 생성한 결과 확인:
   - 러시아어 번역
   - 발음 표기
   - 3개 활용 예제 (각각 러시아어 번역 포함)
4. 🔊 버튼으로 발음 듣기
5. 자동으로 노트에 저장됨

### 저장된 어휘 관리
- 저장된 어휘 목록에서 "상세보기" 클릭
- 불필요한 어휘 "삭제" 가능
- 최신 순으로 정렬 표시

### 음성 기능
- 브라우저 내장 TTS 사용
- 한국어 발음으로 자동 설정
- 조금 느린 속도로 명확하게 재생

## 🎯 AI 생성 예시

**입력**: "사랑해"

**생성 결과**:
```
🇷🇺 러시아어: Я тебя люблю
🔊 발음: [sa-rang-hae]

💡 활용 예제:
1. "정말 사랑해" → "Я действительно тебя люблю"
2. "사랑해서 행복해" → "Счастлива, потому что люблю тебя"  
3. "사랑한다고 말했어" → "Сказал, что люблю"
```

## 📁 프로젝트 구조

```
korean-vocab-app/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 메인 앱
│   ├── models.py        # Pydantic 모델 정의
│   ├── ai_service.py    # Gemini AI 연동
│   └── storage.py       # JSON 파일 저장소
├── static/
│   ├── style.css        # 웹 스타일
│   ├── script.js        # 프론트엔드 JavaScript
│   ├── manifest.json    # PWA 매니페스트
│   ├── sw.js           # Service Worker
│   └── icons/          # PWA 아이콘들
├── templates/
│   └── index.html       # 메인 페이지 템플릿
├── requirements.txt     # Python 패키지 의존성
├── render.yaml         # Render 배포 설정
├── run.py              # 실행 스크립트
└── vocabulary_data.json # 어휘 데이터 저장 파일 (자동 생성)
```

## 🔧 개발 설정

### 환경 요구사항
- Python 3.8+
- Google Gemini API 키
- 모던 웹브라우저 (Chrome, Firefox, Safari 등)

### 개발 모드 실행
```bash
# 자동 리로드 모드로 실행
python run.py

# 또는 직접 uvicorn 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API 엔드포인트
- `GET /`: 메인 페이지
- `POST /api/generate-vocabulary`: 어휘 생성
- `GET /api/vocabulary`: 모든 어휘 목록
- `GET /api/vocabulary/{word}`: 특정 어휘 조회
- `DELETE /api/vocabulary/{word}`: 어휘 삭제
- `GET /health`: 서버 상태 확인

## 🌐 배포

### 로컬 배포 (권장)
- 개인 사용 목적으로 로컬에서 실행
- 데이터는 로컬 JSON 파일에 저장
- Google API 키는 환경변수로 관리

### 주의사항
- Google API 키는 절대 코드에 하드코딩하지 마세요
- vocabulary_data.json 파일은 중요한 학습 데이터이므로 백업 권장
- AI 생성 결과는 참고용이며, 완벽하지 않을 수 있습니다

## 🗺️ 향후 로드맵

### 단기 계획 (1-2개월)
- 🎤 **음성 인식**: 한국어 발음 연습 기능
- 📊 **학습 통계**: 일일/주간/월간 학습 진도 추적
- 🔍 **검색 기능**: 저장된 어휘 빠른 검색

### 중기 계획 (3-6개월)
- 🧠 **스마트 복습**: 망각 곡선 기반 어휘 복습 알림
- 🎮 **퀴즈 모드**: 학습한 어휘 테스트 게임
- 🌍 **다국어 확장**: 중국어, 일본어 지원

### 장기 계획 (6개월+)
- 👥 **사용자 계정**: 클라우드 동기화 및 멀티 디바이스 지원
- 🤖 **학습 AI**: 개인 맞춤형 학습 추천
- 📱 **모바일 앱**: React Native 기반 네이티브 앱

## 🤝 기여하기

1. 버그 리포트 및 기능 제안 환영
2. 코드 개선 PR 환영
3. 새로운 언어 지원 확장 기여 가능

## 📄 라이선스

MIT License

---

**💡 팁**: 러시아인 여자친구가 매일 새로운 한국어 단어를 1-2개씩 입력해서 학습하면 매우 효과적입니다!