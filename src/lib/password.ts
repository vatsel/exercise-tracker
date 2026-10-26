import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Hashes are stored as "scrypt:<salt>:<hash>" in base64, so each hash carries its own salt.

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keyLength: number) => Promise<Buffer>;

const scheme = "scrypt";
const saltLength = 16;
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltLength);
  const hash = await scryptAsync(password, salt, keyLength);
  return [scheme, salt.toString("base64"), hash.toString("base64")].join(":");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [storedScheme, saltText, hashText] = storedHash.split(":");
  if (storedScheme !== scheme) {
    return false;
  }
  const salt = Buffer.from(saltText, "base64");
  const expected = Buffer.from(hashText, "base64");
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}
