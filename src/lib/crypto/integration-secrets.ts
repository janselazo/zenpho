import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Shown when saving Twilio/SendGrid in Settings if env is unset. */
export const INTEGRATION_SECRETS_KEY_HELP =
  "INTEGRATION_SECRETS_KEY is not set. Generate a 32-byte secret (run: openssl rand -hex 32), add INTEGRATION_SECRETS_KEY=<that value> to .env.local locally or Vercel → Environment Variables for production, then restart npm run dev or redeploy. This key encrypts API tokens stored in the database.";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = "v1:";

function deriveKey(): Buffer {
  const raw = process.env.INTEGRATION_SECRETS_KEY;
  if (!raw?.trim()) {
    throw new Error("INTEGRATION_SECRETS_KEY_MISSING");
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {
    /* ignore */
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptIntegrationSecret(plain: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]);
  return `${PREFIX}${packed.toString("base64")}`;
}

export function decryptIntegrationSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    throw new Error("Invalid ciphertext format");
  }
  const key = deriveKey();
  const packed = Buffer.from(stored.slice(PREFIX.length), "base64");
  if (packed.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Invalid ciphertext length");
  }
  const iv = packed.subarray(0, IV_LEN);
  const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = packed.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
