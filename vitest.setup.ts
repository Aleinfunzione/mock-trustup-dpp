// vitest.setup.ts
import { webcrypto } from "node:crypto";

// Polyfill crypto.getRandomValues per test/jsdom
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto as unknown as Crypto;
}
