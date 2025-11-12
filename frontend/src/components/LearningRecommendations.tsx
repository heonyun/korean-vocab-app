import React, { useEffect } from 'react';
import { useMemoryStore } from '../store/memoryStore';
import { Brain, Clock, Target, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { LearningRecommendation } from '../types/memory';

interface LearningRecommendationsProps {
  className?: string;
  maxItems?: number;
}

export const LearningRecommendations: React.FC<LearningRecommendationsProps> = ({
  className,
  maxItems = 3
}) => {
  const { 
    recommendations, 
    vocabularyProgress, 
    getRecommendations, 
    currentUser,
    loading 
  } = useMemoryStore();

  useEffect(() => {
    if (currentUser && recommendations.length === 0) {
      getRecommendations();
    }
  }, [currentUser, recommendations.length, getRecommendations]);

  const getRecommendationIcon = (type: LearningRecommendation['type']) => {
    switch (type) {
      case 'vocabulary_review':
        return <Brain size={20} className="text-blue-500" />;
      case 'new_topic':
        return <Target size={20} className="text-green-500" />;
      case 'grammar_practice':
        return <TrendingUp size={20} className="text-purple-500" />;
      case 'conversation_practice':
        return <Clock size={20} className="text-orange-500" />;
      default:
        return <Brain size={20} className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: LearningRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'low':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <div className={clsx('space-y-3', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Brain size={20} className="text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            개인화 학습 추천
          </h3>
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={clsx('text-center py-8', className)}>
        <Brain size={32} className="text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 dark:text-gray-400">
          로그인하여 개인화 추천을 확인하세요
        </p>
      </div>
    );
  }

  const displayRecommendations = recommendations.slice(0, maxItems);

  return (
    <div className={clsx('space-y-4', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            개인화 학습 추천
          </h3>
        </div>
        {recommendations.length > 0 && (
          <button
            onClick={() => getRecommendations()}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            새로고침
          </button>
        )}
      </div>

      {/* 학습 진도 요약 */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {vocabularyProgress.learned}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">학습중</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
            {vocabularyProgress.reviewing}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">복습중</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
            {vocabularyProgress.mastered}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">완료</div>
        </div>
      </div>

      {/* 추천 목록 */}
      {displayRecommendations.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 dark:text-gray-400">
            아직 추천 콘텐츠가 없습니다.<br />
            더 많은 학습을 통해 개인화 추천을 받아보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayRecommendations.map((recommendation, index) => (
            <div
              key={index}
              className={clsx(
                'border rounded-lg p-4 hover:shadow-sm transition-shadow',
                getPriorityColor(recommendation.priority)
              )}
            >
              <div className="flex items-start gap-3">
                {getRecommendationIcon(recommendation.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {recommendation.title}
                    </h4>
                    <span className={clsx(
                      'text-xs px-2 py-1 rounded-full',
                      recommendation.priority === 'high' && 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
                      recommendation.priority === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
                      recommendation.priority === 'low' && 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    )}>
                      {recommendation.priority === 'high' && '높음'}
                      {recommendation.priority === 'medium' && '보통'}
                      {recommendation.priority === 'low' && '낮음'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {recommendation.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>난이도: {recommendation.content.difficulty_level}/5</span>
                    <span>예상 시간: {recommendation.content.estimated_time}분</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-600">
                    💡 {recommendation.reasoning}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {recommendations.length > maxItems && (
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {recommendations.length - maxItems}개의 추천이 더 있습니다
          </p>
        </div>
      )}
    </div>
  );
};