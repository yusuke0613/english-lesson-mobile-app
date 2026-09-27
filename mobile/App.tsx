import { useReducer, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createLessonState, lessonReducer } from './src/lesson/reducer';
import { HomeScreen } from './src/screens/HomeScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ui } from './src/theme';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'lesson' | 'settings'>('home');
  const [state, dispatch] = useReducer(lessonReducer, undefined, () => createLessonState(`lesson-${Date.now()}`, new Date().toISOString()));
  return <SafeAreaProvider><SafeAreaView style={ui.page}><StatusBar style="dark" />
    {screen === 'home' ? <HomeScreen onStart={() => setScreen('lesson')} onSettings={() => setScreen('settings')} /> : screen === 'settings' ? <SettingsScreen onBack={() => setScreen('home')} /> : <LessonScreen state={state} dispatch={dispatch} onBack={() => setScreen('home')} />}
  </SafeAreaView></SafeAreaProvider>;
}
