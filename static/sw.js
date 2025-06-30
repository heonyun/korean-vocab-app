// Service Worker for Korean Vocabulary Learning App
// HTMX + PWA 호환성 개선
const APP_VERSION = '0.2.0';
const CACHE_NAME = `korean-vocab-v${APP_VERSION}`;
const STATIC_CACHE = `static-v${APP_VERSION}`;
const DYNAMIC_CACHE = `dynamic-v${APP_VERSION}`;

// 캐시할 정적 리소스 목록
const STATIC_ASSETS = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/static/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  // HTMX 부분 템플릿 캐싱
  '/htmx/vocabulary-list',
  // Samsung Internet 호환성을 위한 필수 아이콘 추가
];

// 캐시할 API 엔드포인트 패턴 (HTMX 포함)
const API_PATTERNS = [
  /\/api\/vocabulary/,
  /\/api\/generate-vocabulary/,
  /\/htmx\/vocabulary-list/,
  /\/htmx\/generate-vocabulary/,
  /\/htmx\/save-vocabulary/,
  /\/htmx\/validate-input/
];

// 설치 이벤트 - 정적 리소스 캐싱
self.addEventListener('install', event => {
  console.log('🔧 Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 정적 리소스 캐싱 중...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ 정적 리소스 캐싱 완료');
        return self.skipWaiting(); // 즉시 활성화
      })
      .catch(error => {
        console.error('❌ 정적 리소스 캐싱 실패:', error);
      })
  );
});

// 활성화 이벤트 - 오래된 캐시 정리
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 활성화 중...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        const deletePromises = cacheNames
          .filter(cacheName => 
            cacheName !== STATIC_CACHE && 
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== CACHE_NAME
          )
          .map(cacheName => {
            console.log(`🗑️ 오래된 캐시 삭제: ${cacheName}`);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('✅ Service Worker 활성화 완료');
        return self.clients.claim(); // 모든 클라이언트 제어
      })
      .catch(error => {
        console.error('❌ Service Worker 활성화 실패:', error);
      })
  );
});

// Fetch 이벤트 - 네트워크 요청 가로채기
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 같은 도메인의 요청만 처리
  if (url.origin !== location.origin) {
    return;
  }

  // GET 요청만 캐싱 처리
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(handleFetch(request));
});

// 요청 처리 로직
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // 1. 정적 리소스 처리 (Cache First)
    if (isStaticAsset(url.pathname)) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // 2. API 요청 처리 (Network First)
    if (isApiRequest(url.pathname)) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }
    
    // 3. 기타 요청은 네트워크 우선
    return await networkFirst(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('❌ Fetch 처리 오류:', error);
    
    // 오프라인 시 대체 페이지 제공
    if (url.pathname === '/' || url.pathname === '') {
      const cache = await caches.open(STATIC_CACHE);
      const cachedResponse = await cache.match('/');
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // 기본 오프라인 응답
    return new Response(
      JSON.stringify({
        error: '오프라인 상태입니다. 네트워크를 확인해주세요.',
        offline: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache First 전략 (정적 리소스용)
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log(`📦 캐시에서 제공: ${request.url}`);
    return cachedResponse;
  }
  
  console.log(`🌐 네트워크에서 가져오기: ${request.url}`);
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network First 전략 (API용)
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    console.log(`🌐 네트워크 우선 시도: ${request.url}`);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // API 응답은 5분간만 캐싱
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache);
      
      // 5분 후 캐시에서 삭제
      setTimeout(() => {
        cache.delete(request);
      }, 5 * 60 * 1000);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log(`📦 네트워크 실패, 캐시에서 시도: ${request.url}`);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// 정적 리소스 판별
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/static/') ||
    pathname === '/' ||
    pathname === '' ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico')
  );
}

// API 요청 판별  
function isApiRequest(pathname) {
  return API_PATTERNS.some(pattern => pattern.test(pathname));
}

// 백그라운드 동기화 (향후 구현)
self.addEventListener('sync', event => {
  console.log('🔄 백그라운드 동기화:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('🔄 백그라운드 동기화 실행 중...');
  // 향후 오프라인 데이터 동기화 로직 구현
}

// 푸시 알림 (향후 구현)
self.addEventListener('push', event => {
  console.log('📢 푸시 알림 수신:', event.data?.text());
  
  const options = {
    body: event.data?.text() || '한국어 학습 시간입니다!',
    icon: '/static/icons/icon-192.png',
    badge: '/static/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '학습하기',
        icon: '/static/icons/action-learn.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/static/icons/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('한국어 어휘 학습 노트', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
  console.log('📢 알림 클릭:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('🎉 Service Worker 로드 완료');