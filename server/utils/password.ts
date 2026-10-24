/**
 * server/utils/password.ts — PBKDF2-SHA256 密码哈希（纯 WebCrypto，无第三方依赖）
 *
 * 存储格式：pbkdf2$<iterations>$<saltBase64>$<hashBase64>
 * 参数：100000 轮迭代，16 字节随机盐，32 字节哈希。
 * 可在 Node 20+ 直接运行（globalThis.crypto），便于冒烟测试。
 */

const ITERATIONS = 100000;
const SALT_LEN = 16;
const HASH_LEN = 32;

const te = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  // btoa 在 Workers 与 Node 均可用
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, [
    'deriveBits'
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    HASH_LEN * 8
  );
  return new Uint8Array(bits);
}

/** 生成存储用哈希串 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

/** 常量时间比较，避免时序侧信道 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** 校验密码；存储串格式非法时返回 false（不抛错，避免信息泄露） */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = Number.parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;
    const salt = fromB64(parts[2]);
    const expected = fromB64(parts[3]);
    const actual = await derive(password, salt, iterations);
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}
