import type { JwtPayload } from '../types';

function base64UrlEncode(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = base64UrlDecode(body);
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = base64UrlDecode(body);
  return crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

export async function signJwt(payload: JwtPayload, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)).buffer);
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)).buffer);
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await importPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));

  return `${signingInput}.${base64UrlEncode(sig)}`;
}

export async function verifyJwt(token: string, publicKeyPem: string): Promise<JwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await importPublicKey(publicKeyPem);
  const enc = new TextEncoder();
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlDecode(sigB64),
    enc.encode(signingInput)
  );

  if (!valid) throw new Error('Invalid JWT signature');

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as JwtPayload;

  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('JWT expired');

  return payload;
}
