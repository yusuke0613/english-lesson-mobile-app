import { useMemo, useSyncExternalStore } from 'react';
import { randomUUID } from 'expo-crypto';
import { createCoachClient } from './coachClient';
import { CoachingSession } from './coachingSession';
import { getDeviceToken } from './deviceToken';
export function useCoaching(discard: () => Promise<boolean>) {
  const session = useMemo(() => new CoachingSession(createCoachClient({ baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '', getToken: getDeviceToken }), randomUUID, discard), [discard]);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { session, snapshot };
}
