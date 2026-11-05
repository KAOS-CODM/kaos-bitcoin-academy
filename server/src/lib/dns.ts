import { Resolver, lookup as osLookup, setServers } from 'node:dns'
import { isIP } from 'node:net'
import type { LookupOptions } from 'node:dns'

export const MONGODB_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'] as const

const DEFAULT_LOOKUP_TIMEOUT_MS = 5000

export interface ResolvedAddress {
  address: string
  family: number
}

export type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | ResolvedAddress[],
  family?: number,
) => void

export type CompatibleLookup = (
  hostname: string,
  options: LookupOptions | number,
  callback: LookupCallback,
) => void

type FinishLookup = (
  error: NodeJS.ErrnoException | null,
  address?: string | ResolvedAddress[],
  family?: number,
) => void

export interface ResolverLike {
  resolve4(
    hostname: string,
    callback: (error: NodeJS.ErrnoException | null, addresses: string[]) => void,
  ): void
  resolve6(
    hostname: string,
    callback: (error: NodeJS.ErrnoException | null, addresses: string[]) => void,
  ): void
}

export interface MongoDnsScope {
  host?: string
  domain?: string
}

export interface MongoLookupConfig extends MongoDnsScope {
  fallbackLookup?: CompatibleLookup
  timeoutMs?: number
}

interface NormalizedLookupOptions {
  all: boolean
  family?: 4 | 6
}

function makeDnsError(code: string, message: string): NodeJS.ErrnoException {
  const error = new Error(message) as NodeJS.ErrnoException
  error.code = code
  error.syscall = 'getaddrinfo'
  return error
}

function asDnsError(error: unknown, hostname: string): NodeJS.ErrnoException {
  if (error && typeof error === 'object' && 'code' in error) {
    const candidate = error as NodeJS.ErrnoException
    if (typeof candidate.code === 'string') {
      const wrapped = new Error(
        candidate.message || `DNS lookup failed for ${hostname}`,
      ) as NodeJS.ErrnoException
      wrapped.code = candidate.code
      wrapped.syscall = 'getaddrinfo'
      return wrapped
    }
  }

  const message = error instanceof Error ? error.message : 'DNS lookup failed'
  return makeDnsError('ENOTFOUND', `${message} (${hostname})`)
}

function normalizeLookupOptions(options: LookupOptions | number): NormalizedLookupOptions {
  if (typeof options === 'number') {
    if (options === 0) return { all: false }
    if (options === 4 || options === 6) return { all: false, family: options }
    throw makeDnsError('EAI_BADFLAGS', `Invalid DNS family: ${options}`)
  }

  const all = options.all === true
  const family = options.family

  if (family === undefined || family === 0) return { all }
  if (family === 4 || family === 'IPv4') return { all, family: 4 }
  if (family === 6 || family === 'IPv6') return { all, family: 6 }

  throw makeDnsError('EAI_BADFLAGS', `Invalid DNS family: ${String(family)}`)
}

function resolveFamily(
  resolver: ResolverLike,
  hostname: string,
  family: 4 | 6,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const callback = (error: NodeJS.ErrnoException | null, addresses: string[]): void => {
      if (error) {
        reject(error)
        return
      }

      if (!Array.isArray(addresses) || addresses.length === 0) {
        reject(makeDnsError('ENODATA', `No ${family === 4 ? 'A' : 'AAAA'} records for ${hostname}`))
        return
      }

      resolve(addresses)
    }

    try {
      if (family === 4) resolver.resolve4(hostname, callback)
      else resolver.resolve6(hostname, callback)
    } catch (error) {
      reject(error)
    }
  })
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, hostname: string): Promise<T> {
  if (timeoutMs <= 0) return promise

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(makeDnsError('ETIMEOUT', `DNS lookup timed out for ${hostname}`))
    }, timeoutMs)

    timer.unref()

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function isInScope(hostname: string, scope: MongoDnsScope): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')

  if (!scope.host && !scope.domain) return true
  if (scope.host && normalized === scope.host) return true
  if (
    scope.domain &&
    (normalized === scope.domain || normalized.endsWith(`.${scope.domain}`))
  ) {
    return true
  }

  return false
}

function selectLookupError(
  errors: NodeJS.ErrnoException[],
  hostname: string,
): NodeJS.ErrnoException {
  return (
    errors.find((error) => error.code === 'ENOTFOUND') ??
    errors.find((error) => error.code === 'ENODATA') ??
    errors[0] ??
    makeDnsError('ENOTFOUND', `No addresses found for ${hostname}`)
  )
}

/**
 * Configures the process-wide c-ares resolver used for MongoDB SRV/TXT lookups.
 * Idempotent after a successful configuration so global DNS is not changed
 * repeatedly while the application is running.
 */
export function createMongoDnsInitializer(
  applyServers: (servers: readonly string[]) => void,
  servers: readonly string[] = MONGODB_DNS_SERVERS,
): () => void {
  let configured = false

  return () => {
    if (configured) return

    try {
      applyServers(servers)
      configured = true
    } catch (error) {
      throw new Error('Failed to configure MongoDB SRV/TXT DNS servers', { cause: error })
    }
  }
}

export const configureMongoDns = createMongoDnsInitializer(setServers)

/**
 * Derives the Atlas hostname scope from the configured MongoDB URI without
 * retaining or logging credentials. SRV target names are siblings of the SRV
 * hostname, so the parent domain is the useful allow-list boundary.
 */
export function deriveMongoDnsScope(uri: string): MongoDnsScope {
  try {
    const parsed = new URL(uri)

    if (parsed.protocol !== 'mongodb+srv:') return {}

    const host = parsed.hostname.toLowerCase().replace(/\.$/, '')
    if (!host.endsWith('.mongodb.net')) return {}

    const labels = host.split('.')
    if (labels.length < 4) return {}

    return { host, domain: labels.slice(1).join('.') }
  } catch {
    return {}
  }
}

export function createMongoResolver(
  servers: readonly string[] = MONGODB_DNS_SERVERS,
): Resolver {
  const resolver = new Resolver({ timeout: DEFAULT_LOOKUP_TIMEOUT_MS, tries: 2 })

  try {
    resolver.setServers([...servers])
  } catch (error) {
    throw new Error('Failed to configure MongoDB DNS resolver', { cause: error })
  }

  return resolver
}

/**
 * Builds a Node-compatible lookup function for the MongoDB driver. A and AAAA
 * records are resolved through the dedicated resolver, with IPv4 addresses
 * ordered first and IPv6 retained as a fallback. Hostnames outside the derived
 * Atlas scope fall back to the operating-system resolver.
 */
export function createMongoLookup(
  resolver: ResolverLike,
  config: MongoLookupConfig = {},
): CompatibleLookup {
  const fallbackLookup = config.fallbackLookup ?? (osLookup as unknown as CompatibleLookup)
  const timeoutMs = config.timeoutMs ?? DEFAULT_LOOKUP_TIMEOUT_MS

  return (hostname, rawOptions, callback) => {
    let completed = false

    const finish: FinishLookup = (error, address, family) => {
      if (completed) return
      completed = true

      if (error) callback(error, address as string, family)
      else callback(null, address as string | ResolvedAddress[], family)
    }

    let options: NormalizedLookupOptions
    try {
      options = normalizeLookupOptions(rawOptions)
    } catch (error) {
      finish(asDnsError(error, hostname))
      return
    }

    const literalFamily = isIP(hostname)
    if (literalFamily !== 0) {
      if (options.family && options.family !== literalFamily) {
        finish(
          makeDnsError(
            'ENOTFOUND',
            `No ${options.family === 4 ? 'IPv4' : 'IPv6'} address for ${hostname}`,
          ),
        )
        return
      }

      if (options.all) finish(null, [{ address: hostname, family: literalFamily }])
      else finish(null, hostname, literalFamily)
      return
    }

    if (!isInScope(hostname, config)) {
      try {
        fallbackLookup(hostname, rawOptions, finish)
      } catch (error) {
        finish(asDnsError(error, hostname))
      }
      return
    }

    const families: Array<4 | 6> = options.family ? [options.family] : [4, 6]
    const tasks = families.map((family) => resolveFamily(resolver, hostname, family))

    void withTimeout(Promise.allSettled(tasks), timeoutMs, hostname)
      .then((results) => {
        const addresses: ResolvedAddress[] = []
        const errors: NodeJS.ErrnoException[] = []

        results.forEach((result, index) => {
          const family = families[index]

          if (result.status === 'fulfilled') {
            for (const address of result.value) addresses.push({ address, family })
          } else {
            errors.push(asDnsError(result.reason, hostname))
          }
        })

        if (addresses.length === 0) {
          finish(selectLookupError(errors, hostname))
          return
        }

        if (options.all) finish(null, addresses)
        else finish(null, addresses[0].address, addresses[0].family)
      })
      .catch((error) => finish(asDnsError(error, hostname)))
  }
}
