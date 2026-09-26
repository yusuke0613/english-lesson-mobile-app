export type Recording = { uri: string; durationMs: number; sizeBytes: number; mimeType: string };
export type RecordingError = 'permission' | 'too-large' | 'too-short' | 'too-long' | 'missing' | 'device' | 'cleanup';
export type RecorderSnapshot = { status: 'idle' | 'preparing' | 'recording' | 'stopping' | 'ready' | 'error'; recording: Recording | null; error: RecordingError | null };
export type RecordingDriver = {
  requestPermission(): Promise<boolean>; prepare(): Promise<void>; start(): void;
  stop(): Promise<Recording>; discard(recording: Recording): Promise<void>;
};

export function validateRecording(recording: Recording): RecordingError | null {
  if (!recording.uri || !Number.isFinite(recording.durationMs) || !Number.isFinite(recording.sizeBytes) || recording.sizeBytes <= 0) return 'missing';
  if (recording.sizeBytes > 5_000_000) return 'too-large';
  if (recording.durationMs < 1000) return 'too-short';
  if (recording.durationMs > 90_000) return 'too-long';
  return null;
}

export class RecordingController {
  private snapshot: RecorderSnapshot = { status: 'idle', recording: null, error: null };
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private operation = 0;
  private starting: Promise<void> | undefined;
  private stopping: Promise<Recording | null> | undefined;

  constructor(private driver: RecordingDriver, private speech: { stop(): Promise<void> }) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(next: RecorderSnapshot) { this.snapshot = next; this.listeners.forEach((listener) => listener()); }
  private clearTimer() { clearTimeout(this.timer); this.timer = undefined; }

  async startRecording(): Promise<void> {
    if (this.snapshot.status !== 'idle' && !(this.snapshot.status === 'error' && !this.snapshot.recording)) return;
    const operation = ++this.operation;
    this.update({ status: 'preparing', recording: null, error: null });
    this.starting = this.begin(operation);
    await this.starting;
  }
  private async begin(operation: number) {
    try {
      await this.speech.stop();
      const granted = await this.driver.requestPermission();
      if (operation !== this.operation) return;
      if (!granted) { this.update({ status: 'error', recording: null, error: 'permission' }); return; }
      await this.driver.prepare();
      if (operation !== this.operation) {
        const file = await this.driver.stop();
        // The cancelling operation owns deletion, including its retryable failure.
        this.update({ status: 'ready', recording: file, error: null });
        return;
      }
      this.driver.start();
      this.update({ status: 'recording', recording: null, error: null });
      this.timer = setTimeout(() => { void this.stopRecording(); }, 90_000);
    } catch {
      this.update({ status: 'error', recording: null, error: 'device' });
    }
  }
  async stopRecording(): Promise<Recording | null> {
    if (this.snapshot.status === 'stopping' && this.stopping) return this.stopping;
    if (this.snapshot.status !== 'recording') return this.snapshot.recording;
    this.clearTimer();
    this.update({ status: 'stopping', recording: null, error: null });
    this.stopping = this.finish();
    return this.stopping;
  }
  private async finish(): Promise<Recording | null> {
    try {
      const recording = await this.driver.stop();
      const error = validateRecording(recording);
      this.update({ status: error ? 'error' : 'ready', recording, error });
      return error ? null : recording;
    } catch {
      this.update({ status: 'error', recording: null, error: 'device' });
      return null;
    }
  }
  async discardRecording(): Promise<boolean> {
    ++this.operation;
    this.clearTimer();
    await this.starting;
    if (this.snapshot.status === 'recording' || this.snapshot.status === 'stopping') await this.stopRecording();
    const recording = this.snapshot.recording;
    try {
      if (recording) await this.driver.discard(recording);
      this.update({ status: 'idle', recording: null, error: null });
      return true;
    } catch {
      this.update({ status: 'error', recording, error: 'cleanup' });
      return false;
    }
  }
}
