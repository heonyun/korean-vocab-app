// __tests__/entities/PlaybackState.test.js
// Red Phase: 실패하는 테스트부터 작성 (TDD)

import { PlaybackState, PLAYBACK_STATES } from '../../src/entities/PlaybackState.js';

describe('PlaybackState Entity', () => {
  describe('생성자 테스트', () => {
    test('기본 상태는 IDLE이어야 함', () => {
      // Red: 아직 PlaybackState 클래스가 구현되지 않았으므로 실패
      const state = new PlaybackState();
      
      expect(state.current).toBe(PLAYBACK_STATES.IDLE);
      expect(state.previousState).toBeNull();
      expect(state.timestamp).toBeInstanceOf(Date);
    });

    test('초기 상태를 지정할 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      const state = new PlaybackState(PLAYBACK_STATES.PLAYING);
      
      expect(state.current).toBe(PLAYBACK_STATES.PLAYING);
      expect(state.previousState).toBeNull();
    });
  });

  describe('상태 전환 테스트', () => {
    test('IDLE에서 PLAYING으로 전환 가능해야 함', () => {
      // Red: 구현 전이므로 실패
      const state = new PlaybackState();
      const canTransition = state.canTransitionTo(PLAYBACK_STATES.PLAYING);
      
      expect(canTransition).toBe(true);
    });

    test('PLAYING에서 PAUSED로 전환 가능해야 함', () => {
      // Red: 구현 전이므로 실패
      const state = new PlaybackState(PLAYBACK_STATES.PLAYING);
      const canTransition = state.canTransitionTo(PLAYBACK_STATES.PAUSED);
      
      expect(canTransition).toBe(true);
    });

    test('COMPLETED에서 IDLE로만 전환 가능해야 함', () => {
      // Red: 구현 전이므로 실패
      const state = new PlaybackState(PLAYBACK_STATES.COMPLETED);
      
      expect(state.canTransitionTo(PLAYBACK_STATES.IDLE)).toBe(true);
      expect(state.canTransitionTo(PLAYBACK_STATES.PLAYING)).toBe(false);
      expect(state.canTransitionTo(PLAYBACK_STATES.PAUSED)).toBe(false);
    });

    test('ERROR 상태에서는 IDLE로만 전환 가능해야 함', () => {
      // Red: 구현 전이므로 실패
      const state = new PlaybackState(PLAYBACK_STATES.ERROR);
      
      expect(state.canTransitionTo(PLAYBACK_STATES.IDLE)).toBe(true);
      expect(state.canTransitionTo(PLAYBACK_STATES.PLAYING)).toBe(false);
    });
  });

  describe('상태 변경 테스트', () => {
    test('유효한 상태로 변경해야 함', () => {
      // Red: 구현 전이므로 실패
      const state = new PlaybackState();
      const oldTimestamp = state.timestamp;
      
      // 약간의 지연을 위해
      setTimeout(() => {
        state.transitionTo(PLAYBACK_STATES.PLAYING);
        
        expect(state.current).toBe(PLAYBACK_STATES.PLAYING);
        expect(state.previousState).toBe(PLAYBACK_STATES.IDLE);
        expect(state.timestamp.getTime()).toBeGreaterThan(oldTimestamp.getTime());
      }, 1);
    });

    test('잘못된 상태 전환은 오류를 발생시켜야 함', () => {
      // Red: 구현 전이므로 실패
      const state = new PlaybackState(PLAYBACK_STATES.COMPLETED);
      
      expect(() => {
        state.transitionTo(PLAYBACK_STATES.PLAYING);
      }).toThrow('Invalid state transition from COMPLETED to PLAYING');
    });
  });

  describe('상태 히스토리 테스트', () => {
    test('상태 변경 히스토리를 추적해야 함', () => {
      // Red: 구현 전이므로 실패
      const state = new PlaybackState();
      
      state.transitionTo(PLAYBACK_STATES.PLAYING);
      state.transitionTo(PLAYBACK_STATES.PAUSED);
      state.transitionTo(PLAYBACK_STATES.PLAYING);
      state.transitionTo(PLAYBACK_STATES.COMPLETED);
      
      const history = state.getHistory();
      expect(history).toHaveLength(5); // 초기 IDLE + 4번 전환
      expect(history[0].state).toBe(PLAYBACK_STATES.IDLE);
      expect(history[4].state).toBe(PLAYBACK_STATES.COMPLETED);
    });

    test('이전 상태로 되돌릴 수 있어야 함', () => {
      // Red: 구현 전이므로 실패
      const state = new PlaybackState();
      state.transitionTo(PLAYBACK_STATES.PLAYING);
      state.transitionTo(PLAYBACK_STATES.PAUSED);
      
      const canRevert = state.revertToPrevious();
      
      expect(canRevert).toBe(true);
      expect(state.current).toBe(PLAYBACK_STATES.PLAYING);
    });
  });
});