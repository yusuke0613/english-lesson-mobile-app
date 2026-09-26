import { RecordingController, validateRecording } from './recorder';

const recording = { uri: 'file:///cache/answer.m4a', durationMs: 3000, sizeBytes: 48000, mimeType: 'audio/mp4' };
function setup(granted = true) {
  const order: string[] = [];
  const driver = {
    requestPermission: jest.fn(async () => granted),
    prepare: jest.fn(async () => { order.push('prepare'); }),
    start: jest.fn(() => { order.push('record'); }),
    stop: jest.fn(async () => ({ ...recording })),
    discard: jest.fn(async () => undefined),
  };
  const speech = { stop: jest.fn(async () => { order.push('speech-stop'); }) };
  return { controller: new RecordingController(driver, speech), driver, order };
}

afterEach(() => jest.useRealTimers());

test('permission denial never opens a recorder', async () => {
  const { controller, driver } = setup(false);
  await controller.startRecording();
  expect(controller.getSnapshot().error).toBe('permission');
  expect(driver.prepare).not.toHaveBeenCalled();
  expect(driver.start).not.toHaveBeenCalled();
});

test('speech ends before recording, and two start taps open one recorder', async () => {
  const { controller, driver, order } = setup();
  await Promise.all([controller.startRecording(), controller.startRecording()]);
  expect(order).toEqual(['speech-stop', 'prepare', 'record']);
  expect(driver.start).toHaveBeenCalledTimes(1);
  await controller.discardRecording();
});

test('cancel stops and deletes the exact temporary recording', async () => {
  const { controller, driver } = setup();
  await controller.startRecording();
  await controller.discardRecording();
  expect(driver.stop).toHaveBeenCalledTimes(1);
  expect(driver.discard).toHaveBeenCalledWith(recording);
  expect(controller.getSnapshot().status).toBe('idle');
  expect(controller.getSnapshot().recording).toBeNull();
});

test('90 seconds stops locally and leaves audio ready for explicit action', async () => {
  jest.useFakeTimers();
  const { controller, driver } = setup();
  await controller.startRecording();
  await jest.advanceTimersByTimeAsync(89999);
  expect(driver.stop).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(driver.stop).toHaveBeenCalledTimes(1);
  expect(controller.getSnapshot().status).toBe('ready');
  expect(controller.getSnapshot().recording).toEqual(recording);
});

test('backgrounding while permission is pending prevents late recording', async () => {
  const { controller, driver } = setup();
  let resolve!: (value: boolean) => void;
  driver.requestPermission.mockImplementation(() => new Promise<boolean>((r) => { resolve = r; }));
  const starting = controller.startRecording();
  await Promise.resolve();
  const cancelling = controller.discardRecording();
  resolve(true);
  await Promise.all([starting, cancelling]);
  expect(driver.start).not.toHaveBeenCalled();
  expect(controller.getSnapshot().status).toBe('idle');
});

test.each([
  [{ ...recording, sizeBytes: 5_000_001 }, 'too-large'],
  [{ ...recording, durationMs: 999 }, 'too-short'],
  [{ ...recording, durationMs: 90_001 }, 'too-long'],
  [{ ...recording, sizeBytes: 0 }, 'missing'],
  [{ ...recording, durationMs: NaN }, 'missing'],
])('rejects invalid audio without labeling an answer wrong', (value, expected) => {
  expect(validateRecording(value)).toBe(expected);
});

test('valid limits allow the recorded file to proceed', () => {
  expect(validateRecording({ ...recording, sizeBytes: 5_000_000, durationMs: 90_000 })).toBeNull();
});

test('failed deletion preserves the file and reports failure until retry succeeds', async () => {
  const { controller, driver } = setup();
  await controller.startRecording();
  await controller.stopRecording();
  driver.discard.mockRejectedValueOnce(new Error('disk unavailable'));
  expect(await controller.discardRecording()).toBe(false);
  expect(controller.getSnapshot()).toMatchObject({ error: 'cleanup', recording });
  expect(await controller.discardRecording()).toBe(true);
  expect(controller.getSnapshot().recording).toBeNull();
});

test('cancelling during prepare keeps a file whose deletion fails', async () => {
  const { controller, driver } = setup();
  let prepared!: () => void;
  driver.prepare.mockImplementation(() => new Promise<void>((resolve) => { prepared = resolve; }));
  driver.discard.mockRejectedValueOnce(new Error('disk unavailable'));
  const starting = controller.startRecording();
  await Promise.resolve();
  await Promise.resolve();
  const cancelling = controller.discardRecording();
  prepared();
  await starting;
  expect(await cancelling).toBe(false);
  expect(driver.start).not.toHaveBeenCalled();
  expect(controller.getSnapshot()).toMatchObject({ error: 'cleanup', recording });
  expect(await controller.discardRecording()).toBe(true);
});
