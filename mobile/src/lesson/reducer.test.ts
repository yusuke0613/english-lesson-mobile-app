import { createLessonState, lessonReducer } from './reducer';

describe('lesson learning evidence', () => {
  const start = () => createLessonState('session-1', '2026-09-26T01:00:00Z');

  test('a first lesson starts with preparation, not a fabricated previous review', () => {
    expect(start().phase).toBe('prepare');
    expect(start().attempts).toEqual([]);
  });

  test('practice starts with English visible and optional Japanese hidden', () => {
    const state = lessonReducer(start(), { type: 'START_PRACTICE' });
    expect(state.questionId).toBe('intro-name');
    expect(state.visibleSupport).toEqual({ english: true, meaning: false, template: false });
    expect(state.support.englishViewed).toBe(true);
    expect(state.status).toBe('idle');
  });

  test('closing a meaning hint keeps evidence and does not complete an answer', () => {
    const practice = lessonReducer(start(), { type: 'START_PRACTICE' });
    const opened = lessonReducer(practice, { type: 'TOGGLE_SUPPORT', kind: 'meaning' });
    const closed = lessonReducer(opened, { type: 'TOGGLE_SUPPORT', kind: 'meaning' });
    expect(closed.visibleSupport.meaning).toBe(false);
    expect(closed.support.meaningViewed).toBe(true);
    expect(closed.status).toBe('idle');
    expect(closed.attempts).toHaveLength(0);
  });

  test('opening and closing an answer example is remembered independently', () => {
    let state = lessonReducer(start(), { type: 'START_PRACTICE' });
    state = lessonReducer(state, { type: 'TOGGLE_SUPPORT', kind: 'template' });
    state = lessonReducer(state, { type: 'TOGGLE_SUPPORT', kind: 'template' });
    expect(state.support.templateViewed).toBe(true);
    expect(state.support.meaningViewed).toBe(false);
  });

  test.each(['check', 'review'] as const)('%s begins with the question hidden', (mode) => {
    const state = createLessonState('session-2', '2026-09-27T01:00:00Z', mode);
    expect(state.visibleSupport.english).toBe(false);
    expect(state.support.englishViewed).toBe(false);
    expect(state.visibleSupport.meaning).toBe(false);
  });
});
