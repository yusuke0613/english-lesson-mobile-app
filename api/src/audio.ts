import { ApiError } from './types';

// Accept a narrow uncompressed format so cost/length cannot be forged in metadata.
export function pcmDuration(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fourCC = (offset: number) => new TextDecoder().decode(bytes.subarray(offset, offset + 4));
  if (bytes.length > 5_000_000) throw new ApiError('AUDIO_TOO_LARGE', 413);
  if (bytes.length < 44 || fourCC(0) !== 'RIFF' || fourCC(8) !== 'WAVE' || view.getUint32(4, true) !== bytes.length - 8) throw new ApiError('UNSUPPORTED_AUDIO', 415);
  let offset = 12;
  let formatSeen = false;
  let dataLength: number | undefined;
  while (offset + 8 <= bytes.length) {
    const kind = fourCC(offset);
    const length = view.getUint32(offset + 4, true);
    const data = offset + 8;
    if (data + length > bytes.length) throw new ApiError('INVALID_AUDIO', 400);
    if (!['fmt ', 'data', 'JUNK', 'FLLR'].includes(kind)) throw new ApiError('UNSUPPORTED_AUDIO', 415);
    if (kind === 'fmt ') {
      if (formatSeen || length < 16 || view.getUint16(data, true) !== 1 || view.getUint16(data + 2, true) !== 1 || view.getUint32(data + 4, true) !== 16000 || view.getUint32(data + 8, true) !== 32000 || view.getUint16(data + 12, true) !== 2 || view.getUint16(data + 14, true) !== 16) throw new ApiError('UNSUPPORTED_AUDIO', 415);
      formatSeen = true;
    }
    if (kind === 'data') {
      if (!formatSeen || dataLength !== undefined || length % 2) throw new ApiError('INVALID_AUDIO', 400);
      dataLength = length;
    }
    offset = data + length + (length % 2);
  }
  const durationMs = (dataLength ?? 0) / 32;
  if (offset !== bytes.length || !formatSeen || durationMs < 1000 || durationMs > 90000) throw new ApiError('INVALID_AUDIO', 400);
  return durationMs;
}
