import { webcrypto } from 'node:crypto';

// Node 18 does not expose `crypto` as a global; Node 19+ does.
// Vitest runs in Node 18 in this environment, so we polyfill it here.
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}
