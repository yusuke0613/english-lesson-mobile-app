import * as SecureStore from 'expo-secure-store';
import { isDeviceToken } from './coachClient';
const key = 'english-coach-device-token';
export const getDeviceToken = () => SecureStore.getItemAsync(key);
export async function saveDeviceToken(token: string) {
  if (!isDeviceToken(token)) throw new Error('Invalid device token');
  await SecureStore.setItemAsync(key, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
export const deleteDeviceToken = () => SecureStore.deleteItemAsync(key);
