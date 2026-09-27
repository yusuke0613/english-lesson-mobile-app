export const token = 'ec_' + 'a'.repeat(43);
export const support = { englishViewed: true, meaningViewed: false, templateViewed: false, examplePlayed: false, playCount: 1, slowPlayed: false };
export const replyInput = { lessonId: 'self-introduction', questionId: 'intro-name', transcript: 'You can call me Alex.', support, context: [] };
export const evaluation = { outcome: 'answered', reasonJa: '呼び名を伝えられました。', replyEn: 'Nice to meet you, Alex.', correction: null };
export function responseBody(value: unknown = evaluation) {
  return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }], usage: { input_tokens: 200, output_tokens: 80 } };
}
export function wav(seconds = 3) {
  const dataLength = Math.round(seconds * 32000);
  const result = new Uint8Array(44 + dataLength);
  const view = new DataView(result.buffer);
  const text = (offset: number, value: string) => result.set(new TextEncoder().encode(value), offset);
  text(0, 'RIFF'); view.setUint32(4, result.length - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, dataLength, true);
  return result;
}
