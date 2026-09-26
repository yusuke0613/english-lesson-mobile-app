import { LessonEvent, LessonState, SupportUsage } from './types';

export function emptySupport(englishViewed: boolean): SupportUsage {
  return { englishViewed, meaningViewed: false, templateViewed: false, examplePlayed: false, playCount: 0, slowPlayed: false };
}
export function createLessonState(sessionId: string, startedAt: string, mode?: 'check' | 'review'): LessonState {
  const english = !mode;
  return { sessionId, startedAt, phase: mode ?? 'prepare', questionId: mode === 'review' ? 'intro-work-review' : mode === 'check' ? 'intro-work-check' : 'intro-name', visibleSupport: { english, meaning: false, template: false }, support: emptySupport(english), status: 'idle', attempts: [] };
}
export function lessonReducer(state: LessonState, event: LessonEvent): LessonState {
  switch (event.type) {
    case 'START_PRACTICE': return state.phase === 'prepare' ? { ...state, phase: 'practice' } : state;
    case 'TOGGLE_SUPPORT': {
      const visible = !state.visibleSupport[event.kind];
      const field = `${event.kind}Viewed` as 'englishViewed' | 'meaningViewed' | 'templateViewed';
      return { ...state, visibleSupport: { ...state.visibleSupport, [event.kind]: visible }, support: { ...state.support, [field]: state.support[field] || visible } };
    }
  }
}
