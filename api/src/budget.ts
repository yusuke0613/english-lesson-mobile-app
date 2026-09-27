import { ApiError, type LedgerDb, type Stage } from './types';

export function billingMonth(now: Date): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}
export const reserves = { transcription: 9000, reply: 8384, summary: 9024 } satisfies Record<Stage, number>;

export async function reserveUsage(db: LedgerDb, deviceId: string, id: string, stage: Stage, now: Date, limit: number) {
  // One SQL statement serializes the budget check and insert across Worker instances.
  // The budget covers every device/token; token rotation never resets it.
  const inserted = await db.prepare(`INSERT INTO requests (id, device_id, stage, month, reserved_micro_usd, status, created_at)
    SELECT ?, ?, ?, ?, ?, 'pending', ?
    WHERE ? + COALESCE((SELECT SUM(COALESCE(charged_micro_usd, reserved_micro_usd)) FROM requests WHERE month = ?), 0) <= ?
      AND NOT EXISTS (SELECT 1 FROM requests WHERE charged_micro_usd > reserved_micro_usd)
    ON CONFLICT(id) DO NOTHING RETURNING id`)
    .bind(id, deviceId, stage, billingMonth(now), reserves[stage], Math.floor(now.getTime() / 1000), reserves[stage], billingMonth(now), limit).first();
  if (inserted) return;
  const existing = await db.prepare('SELECT status FROM requests WHERE id = ?').bind(id).first<{ status: string }>();
  if (existing) throw new ApiError(existing.status === 'pending' ? 'REQUEST_IN_PROGRESS' : 'RESULT_UNAVAILABLE', 409);
  throw new ApiError('BUDGET_EXCEEDED', 429);
}

export async function settleUsage(db: LedgerDb, id: string, cost: number) {
  if (!Number.isSafeInteger(cost) || cost < 0) throw new Error('Invalid usage');
  const result = await db.prepare("UPDATE requests SET charged_micro_usd = ?, status = 'completed' WHERE id = ? AND status = 'pending'").bind(cost, id).run();
  if (result.meta.changes !== 1) throw new Error('Settlement not applied');
}
export async function markUnknown(db: LedgerDb, id: string) {
  await db.prepare("UPDATE requests SET status = 'unknown' WHERE id = ? AND status = 'pending'").bind(id).run();
}
