import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const id = process.argv[2] ?? 'owner-iphone';
if (!/^[a-z0-9-]{1,48}$/.test(id)) throw new Error('Use a device ID containing 1–48 lowercase letters, numbers, or hyphens.');
const directory = resolve('local-data');
await mkdir(directory, { recursive: true });
const token = `ec_${randomBytes(32).toString('base64url')}`;
const hash = createHash('sha256').update(token).digest('hex');
const expires = Math.floor(Date.now() / 1000) + 30 * 86400;
// Exclusive creation prevents accidentally replacing a working credential.
await writeFile(resolve(directory, `${id}-token.txt`), token, { flag: 'wx', mode: 0o600 });
await writeFile(resolve(directory, `${id}-register.sql`), `INSERT INTO devices (id, token_hash, expires_at, revoked) VALUES ('${id}', '${hash}', ${expires}, 0);\n`, { flag: 'wx', mode: 0o600 });
await writeFile(resolve(directory, `${id}-revoke.sql`), `UPDATE devices SET revoked = 1 WHERE id = '${id}';\n`, { flag: 'wx', mode: 0o600 });
console.log(`Created files under local-data/ for ${id}. Token expires in 30 days. The token was not printed.`);
