# 업데이트 시스템 로컬 테스트 가이드

## 🧪 테스트 시나리오

### 1. 기본 기능 테스트
```bash
# WSL에서 로컬 서버 실행
python run.py

# 접속 방법:
# 🔴 WSL 내부: http://localhost:8000 (WSL 터미널에서만)
# ✅ Windows 브라우저: http://172.26.174.167:8000 (엣지/크롬에서)
```

### 🚨 WSL-Windows 접속 주의사항
- `localhost:8000`은 WSL 내부에서만 접근 가능
- **Windows 브라우저에서는 WSL IP 사용**: `http://172.26.174.167:8000`
- 서버 실행시 두 URL이 모두 표시됨

### 2. Service Worker 등록 확인
1. 브라우저 개발자도구 (F12) 열기
2. **Console 탭**에서 확인:
   ```
   🎉 Service Worker 등록 성공: http://localhost:8000/
   ```
3. **Application 탭** → **Service Workers**에서 등록 상태 확인

### 3. 업데이트 알림 시뮬레이션

#### 방법 1: 수동 트리거 (개발자도구)
```javascript
// 브라우저 Console에서 실행
showUpdateBanner();
```

#### 방법 2: Service Worker 버전 변경
1. `static/sw.js` 파일 수정:
   ```javascript
   const APP_VERSION = '0.1.6';  // 버전 업데이트
   ```
2. 브라우저 새로고침 (Ctrl+F5)
3. 개발자도구 → Application → Service Workers → "Update" 클릭
4. 업데이트 배너가 상단에 나타나는지 확인

#### 방법 3: 캐시 강제 무효화
```javascript
// Console에서 실행
navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
        registration.update();
    }
});
```

### 4. 업데이트 배너 UI 테스트

#### 예상 동작:
1. **배너 표시**: 상단에 녹색 업데이트 배너 등장
2. **업데이트 버튼**: 클릭시 페이지 새로고침
3. **나중에 버튼**: 클릭시 배너 숨김 + 10분 후 재표시
4. **모바일 반응형**: 세로 레이아웃으로 변경

### 5. 캐시 동작 테스트

#### 오프라인 테스트:
1. 페이지 로드 후 네트워크 끊기
2. 개발자도구 → Network → "Offline" 체크
3. 페이지 새로고침해도 작동하는지 확인

#### 캐시 무효화 테스트:
1. 개발자도구 → Application → Storage → "Clear storage"
2. 페이지 새로고침하여 다시 캐시되는지 확인

## 🚨 주의사항

### localhost vs 배포 환경 차이점:
- **localhost**: Service Worker 등록이 바로 되지만 HTTPS 없음
- **Render**: HTTPS 환경에서 PWA 기능 완전 지원

### 캐시 이슈 해결:
```bash
# 강제 새로고침
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# 개발자도구에서 캐시 무시
네트워크 탭에서 "Disable cache" 체크
```

## 📝 테스트 체크리스트

- [ ] 로컬 서버 정상 실행 (http://localhost:8000)
- [ ] 버전 정보 표시 (v0.1.5)
- [ ] Service Worker 등록 성공
- [ ] 업데이트 배너 수동 트리거
- [ ] "업데이트" 버튼 동작 (페이지 새로고침)
- [ ] "나중에" 버튼 동작 (배너 숨김)
- [ ] 모바일 뷰 반응형 테스트
- [ ] 오프라인 모드 동작 확인
- [ ] 콘솔 에러 없음 확인

## 🔧 디버깅 팁

### Console 로그 확인:
```javascript
// 업데이트 관련 로그들
🔧 Service Worker 설치 중...
🎉 Service Worker 등록 성공
🚀 새 버전 감지됨!
📥 업데이트 적용 중...
```

### 문제 해결:
1. **Service Worker 등록 실패**: HTTPS 필요 (localhost는 예외)
2. **업데이트 배너 안보임**: `showUpdateBanner()` 수동 실행
3. **API 에러**: `.env` 파일의 `GOOGLE_API_KEY` 확인
4. **포트 충돌**: `PORT=8001 python run.py`로 다른 포트 사용