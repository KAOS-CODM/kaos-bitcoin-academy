import { argon2id, hash, verify, type HashOptions } from 'argon2'

const HASH_OPTIONS: HashOptions = {
  type: argon2id,
  memoryCost: 19456, // 19 MiB, OWASP baseline for Argon2id
  timeCost: 2,
  parallelism: 1,
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS)
}

export async function verifyPassword(digest: string, password: string): Promise<boolean> {
  try {
    return await verify(digest, password)
  } catch {
    return false
  }
}
