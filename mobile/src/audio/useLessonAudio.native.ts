import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { RecordingController } from './recorder';
import { speakEnglish, stopSpeech } from './speech';
import { LessonAudio } from './useLessonAudio.types';

class RecordingDuration {
  private durationMs = 0;
  reset() { this.durationMs = 0; }
  measure = (value: number) => { this.durationMs = Math.max(this.durationMs, value); return this.durationMs; };
}

export function useLessonAudio(): LessonAudio {
  const controllerRef = useRef<RecordingController | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [interrupted, setInterrupted] = useState(false);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 }, (event) => {
    if (event.hasError || event.mediaServicesDidReset) setInterrupted(true);
    if (event.isFinished || event.hasError) void controllerRef.current?.stopRecording();
  });
  const { controller, measureDuration } = useMemo(() => {
    const duration = new RecordingDuration();
    const controller = new RecordingController({
      requestPermission: async () => (await requestRecordingPermissionsAsync()).granted,
      prepare: async () => {
        duration.reset();
        setDurationMs(0);
        await setAudioModeAsync({ allowsRecording: true, allowsBackgroundRecording: false, shouldPlayInBackground: false, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
      },
      start: () => recorder.record({ forDuration: 90 }),
      stop: async () => {
        // iOS resets the SDK duration before notifying us of automatic completion.
        const durationMs = duration.measure(recorder.getStatus().durationMillis);
        try { await recorder.stop(); }
        finally { await setAudioModeAsync({ allowsRecording: false }); }
        const uri = recorder.uri;
        if (!uri) throw new Error('Recording file unavailable');
        const file = new File(uri);
        return { uri, durationMs, sizeBytes: file.exists ? file.size : 0, mimeType: 'audio/mp4' };
      },
      discard: async (recording) => { const file = new File(recording.uri); if (file.exists) file.delete(); },
    }, { stop: stopSpeech });
    return { controller, measureDuration: duration.measure };
  }, [recorder]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    if (snapshot.status !== 'recording') return;
    const timer = setInterval(() => {
      if (controller.getSnapshot().status !== 'recording') return;
      // Read a fresh native status: a hook's pre-start snapshot may still say false.
      const status = recorder.getStatus();
      setDurationMs(measureDuration(status.durationMillis));
      if (!status.isRecording || status.mediaServicesDidReset) {
        setInterrupted(true);
        void controller.stopRecording();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [controller, recorder, measureDuration, snapshot.status]);

  useEffect(() => {
    controllerRef.current = controller;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') return;
      void stopSpeech();
      const status = controller.getSnapshot().status;
      if (status === 'recording') { setInterrupted(true); void controller.stopRecording(); }
      if (status === 'preparing') { setInterrupted(true); void controller.discardRecording(); }
    });
    return () => { controllerRef.current = null; subscription.remove(); void stopSpeech(); void controller.discardRecording(); };
  }, [controller]);

  return {
    snapshot, durationMs: snapshot.recording?.durationMs ?? durationMs, interrupted, canRecord: true,
    startRecording: async () => { setInterrupted(false); await controller.startRecording(); },
    stopRecording: () => controller.stopRecording(),
    discardRecording: async () => { setInterrupted(false); return controller.discardRecording(); },
    speakEnglish: async (text, slow) => {
      if (['preparing', 'recording', 'stopping'].includes(controller.getSnapshot().status)) return;
      await speakEnglish(text, slow);
    },
  };
}
