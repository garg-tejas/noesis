import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.SUBSTACK_SESSION_ENCRYPTION_KEY
  if (!encodedKey) {
    throw new Error("SUBSTACK_SESSION_ENCRYPTION_KEY is not configured")
  }

  const key = Buffer.from(encodedKey, "base64")
  if (key.length !== 32) {
    throw new Error("SUBSTACK_SESSION_ENCRYPTION_KEY must be a base64-encoded 32-byte value")
  }
  return key
}

export function encryptSubstackSession(session: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(session, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".")
}

export function decryptSubstackSession(value: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".")
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored Substack session has an invalid format")
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
