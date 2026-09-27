import { ApiError, type LedgerDb } from './types';

export async function authenticate(header: string | null, db: LedgerDb, now: number): Promise<string> {
  const token = /^Bearer (ec_[A-Za-z0-9_-]{43})$/.exec(header ?? '')?.[1];
  if (!token) throw new ApiError('UNAUTHORIZED', 401);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, '0')).join('');
  const device = await db.prepare('SELECT id, expires_at, revoked FROM devices WHERE token_hash = ?').bind(hash).first<{ id: string; expires_at: number; revoked: number }>();
  if (!device) throw new ApiError('UNAUTHORIZED', 401);
  if (device.revoked || device.expires_at <= now) throw new ApiError('DEVICE_DISABLED', 403);
  return device.id;
}
