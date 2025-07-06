import { useEffect } from 'react';
import { X, Plus, RefreshCw } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useBookmarkStore } from '../store/bookmarkStore';
import { clsx } from 'clsx';

export const Sidebar: React.FC = () => {
  const {
    sessions,
    currentSessionId,
    isSidebarOpen,
    setSidebarOpen,
    loadSessions,
    loadSession,
    createNewSession,
    deleteSession
  } = useChatStore();

  const { bookmarks, reviewBookmarks, loadBookmarks, loadReviewBookmarks } = useBookmarkStore();

  useEffect(() => {
    if (isSidebarOpen) {
      loadSessions();
      loadBookmarks();
      loadReviewBookmarks();
    }
  }, [isSidebarOpen, loadSessions, loadBookmarks, loadReviewBookmarks]);

  const handleSessionClick = async (sessionId: string) => {
    await loadSession(sessionId);
    setSidebarOpen(false);
  };

  const handleNewChat = async () => {
    await createNewSession();
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 대화를 삭제하시겠습니까?')) {
      await deleteSession(sessionId);
    }
  };

  return (
    <>
      {/* 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <div
        className={clsx(
          'fixed left-0 top-0 h-full w-80 max-w-sm bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col transition-transform duration-300',
          'lg:transform-none lg:relative lg:shadow-none',
          isSidebarOpen ? 'transform translate-x-0' : 'transform -translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Korean Chat</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* 새 대화 버튼 */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
          >
            <Plus size={20} />
            <span>새 대화 시작</span>
          </button>

          <div className="border-t border-gray-200 dark:border-gray-600 my-4"></div>
        </div>

        {/* 대화 기록 */}
        <div className="flex-1 overflow-hidden flex flex-col px-6">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">대화 기록</h3>
          <div className="space-y-2 overflow-y-auto flex-1">
            {sessions.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                저장된 대화가 없습니다
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.session_id}
                  className={clsx(
                    'group p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer',
                    currentSessionId === session.session_id && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => handleSessionClick(session.session_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                        {session.title || '제목 없음'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {session.message_count || 0}개 메시지 • {new Date(session.last_updated || session.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.session_id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 하단 고정 영역: 북마크 & 복습 */}
        <div className="border-t border-gray-200 dark:border-gray-600 p-6 space-y-2 flex-shrink-0">
          <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-orange-600 dark:text-orange-400">
            <span className="text-xl">🦊</span>
            <span>북마크 보기</span>
            <span className="ml-auto text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
              {bookmarks.length}
            </span>
          </button>

          <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-green-600 dark:text-green-400">
            <RefreshCw size={18} />
            <span>복습하기</span>
            <span className="ml-auto text-xs bg-green-500 text-white px-2 py-1 rounded-full">
              {reviewBookmarks.length}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};