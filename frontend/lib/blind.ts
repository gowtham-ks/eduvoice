/**
 * Client-side RSA blind signatures. Mirrors backend/app/blind.py.
 * The nonce and blinding factor never leave the browser, so the server signs
 * a value it cannot link to the credential used later.
 * Needs a secure context (https or localhost) for crypto.subtle.
 */
const enc = new TextEncoder();

export const toHex = (b: bigint) => b.toString(16);
export const fromHex = (h: string) => BigInt("0x" + h);

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1);
  base %= mod;
  while (exp > BigInt(0)) {
    if (exp & BigInt(1)) result = (result * base) % mod;
    exp >>= BigInt(1);
    base = (base * base) % mod;
  }
  return result;
}

function egcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  let [oldR, r] = [a, b];
  let [oldS, s] = [BigInt(1), BigInt(0)];
  let [oldT, t] = [BigInt(0), BigInt(1)];
  while (r !== BigInt(0)) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }
  return [oldR, oldS, oldT];
}

function modInv(a: bigint, m: bigint): bigint {
  const [g, x] = egcd(((a % m) + m) % m, m);
  if (g !== BigInt(1)) throw new Error("No modular inverse");
  return ((x % m) + m) % m;
}

const bytesToBig = (bytes: Uint8Array) =>
  BigInt("0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));

const bitLength = (n: bigint) => n.toString(2).length;

export function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function fdh(message: Uint8Array, n: bigint): Promise<bigint> {
  const k = Math.floor((bitLength(n) - 1) / 8);
  const out = new Uint8Array(Math.ceil(k / 32) * 32);
  for (let counter = 0, offset = 0; offset < k; counter++, offset += 32) {
    const input = new Uint8Array(4 + message.length);
    new DataView(input.buffer).setUint32(0, counter);
    input.set(message, 4);
    out.set(new Uint8Array(await crypto.subtle.digest("SHA-256", input)), offset);
  }
  return bytesToBig(out.slice(0, k));
}

function randomInvertible(n: bigint): bigint {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(bitLength(n) / 8)));
    const r = bytesToBig(bytes) % n;
    if (r > BigInt(1) && egcd(r, n)[0] === BigInt(1)) return r;
  }
}

export type Blinded = { blinded: bigint; r: bigint; hashed: bigint };

export async function blindMessage(message: string, n: bigint, e: bigint): Promise<Blinded> {
  const hashed = await fdh(enc.encode(message), n);
  const r = randomInvertible(n);
  return { blinded: (hashed * modPow(r, e, n)) % n, r, hashed };
}

/** Removes the blinding factor and checks the result is a valid signature on the message. */
export function unblind(blindSig: bigint, b: Blinded, n: bigint, e: bigint): bigint {
  const sig = (blindSig * modInv(b.r, n)) % n;
  if (modPow(sig, e, n) !== b.hashed) throw new Error("The server's signature did not verify");
  return sig;
}

/** Saved only in this browser. If it is lost, the credential cannot be recovered. */
export type Credential = { nonce: string; signature: string };
const key = (id: number | string, kind: "cred" | "done") => `eduvoice:${kind}:${id}`;

export function loadCredential(id: number | string): Credential | null {
  try {
    const raw = localStorage.getItem(key(id, "cred"));
    return raw ? (JSON.parse(raw) as Credential) : null;
  } catch {
    return null;
  }
}
export function saveCredential(id: number | string, c: Credential) {
  try { localStorage.setItem(key(id, "cred"), JSON.stringify(c)); } catch {}
}
export function markSubmitted(id: number | string) {
  try {
    localStorage.removeItem(key(id, "cred"));
    localStorage.setItem(key(id, "done"), "1");
  } catch {}
}
export function isSubmitted(id: number | string): boolean {
  try { return localStorage.getItem(key(id, "done")) === "1"; } catch { return false; }
}
