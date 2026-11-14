/**
 * In-memory fake NIP-47 transport for offline testing.
 *
 * The fake replaces `NWCClient.pool` — a public, non-readonly property — so the real
 * `@getalby/sdk` still performs real NIP-44 encryption, real event signing, and real
 * response-envelope parsing. No socket is ever opened and no relay or wallet is contacted.
 *
 * The fake acts as the wallet service: it decrypts each published request with the real
 * NIP-44 conversation key, reads the requested method, and answers with a synthetic
 * kind-23195 response event.
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const requireFromClient = createRequire(path.join(ROOT, 'client/package.json'))

const nostrTools = requireFromClient('nostr-tools') as {
  nip44: {
    getConversationKey(privkeyA: Uint8Array, pubkeyB: string): Uint8Array
    encrypt(plaintext: string, conversationKey: Uint8Array): string
    decrypt(payload: string, conversationKey: Uint8Array): string
  }
  utils: {
    hexToBytes(hex: string): Uint8Array
    bytesToHex(bytes: Uint8Array): string
  }
  finalizeEvent(
    template: {
      kind: number
      created_at: number
      tags: string[][]
      content: string
    },
    secretKey: Uint8Array,
  ): { id: string; pubkey: string; sig: string; kind: number; tags: string[][]; content: string }
}

export const NIP47_INFO_KIND = 13194
export const NIP47_RESPONSE_KIND = 23195

export interface FakeIdentity {
  /** NWC connection secret used by the client (hex). */
  clientSecret: string
  /** Wallet service secret used by the fake wallet (hex). */
  walletSecret: string
  /** Wallet service public key (hex). */
  walletPubkey: string
  /** Client public key derived from `clientSecret` (hex). */
  clientPubkey: string
}

export interface FakeRecordedSubscription {
  relays: string[]
  filter: { kinds?: number[]; authors?: string[]; limit?: number; '#e'?: string[] }
  params: { onevent?: (event: unknown) => void }
  closed: boolean
  closeCount: number
}

export interface FakeRecordedRequest {
  method: string
  params: unknown
  eventId: string
  relays: string[]
  plaintext: string
}

export type FakeResponse =
  | { kind: 'none' }
  | { kind: 'envelope'; envelope: unknown; delayMs?: number }
  | { kind: 'plaintext'; plaintext: string; delayMs?: number }

export type FakeResponder = (
  method: string,
  request: FakeRecordedRequest,
) => FakeResponse | undefined

export interface FakePoolOptions {
  identity: FakeIdentity
  responder?: FakeResponder
  /** When true, `publish` rejects so the adapter sees "no relay accepted". */
  rejectPublish?: boolean
  /**
   * Overrides the result the fake wallet service returns for `get_info`.
   *
   * The default answer is the capability list the fake always reports. A test that needs a
   * different `get_info` answer passes it here; the `responder` is not consulted for
   * `get_info`, because the fake answers that method itself.
   */
  getInfoResult?: unknown
}

const DEFAULT_GET_INFO_CAPABILITIES = [
  'get_info',
  'pay_invoice',
  'make_invoice',
  'lookup_invoice',
]

export class FakeNip47Pool {
  /** Mirrors the SDK's public `ReconnectingPool.publishTimeout`. */
  readonly publishTimeout = 5000

  readonly subscriptions: FakeRecordedSubscription[] = []
  readonly requests: FakeRecordedRequest[] = []
  readonly closedRelays: string[] = []

  private readonly identity: FakeIdentity
  private readonly responder?: FakeResponder
  private readonly rejectPublish: boolean
  private readonly getInfoResult: unknown
  private readonly conversationKey: Uint8Array

  constructor(options: FakePoolOptions) {
    this.identity = options.identity
    this.responder = options.responder
    this.rejectPublish = options.rejectPublish ?? false
    this.getInfoResult = options.getInfoResult
    this.conversationKey = nostrTools.nip44.getConversationKey(
      nostrTools.utils.hexToBytes(options.identity.walletSecret),
      options.identity.clientPubkey,
    )
  }

  /** Mirrors the SDK's public `ReconnectingPool.ensureRelay`. */
  async ensureRelay(url: string): Promise<{ url: string }> {
    return { url }
  }

  /** Mirrors the SDK's public `ReconnectingPool.listConnectionStatus`. */
  listConnectionStatus(): Map<string, boolean> {
    return new Map(this.identity.walletPubkey ? [[urlOf(this.identity), true]] : [])
  }

  /** Mirrors the SDK's public `ReconnectingPool.close`. */
  close(relays: string[]): void {
    this.closedRelays.push(...relays)
  }

  /** Mirrors the SDK's public `ReconnectingPool.subscribe`. */
  subscribe(
    relays: string[],
    filter: { kinds?: number[]; authors?: string[]; limit?: number; '#e'?: string[] },
    params: { onevent?: (event: unknown) => void },
  ): { close: (reason?: string) => void } {
    const record: FakeRecordedSubscription = {
      relays,
      filter,
      params,
      closed: false,
      closeCount: 0,
    }
    this.subscriptions.push(record)

    // The SDK reads the wallet-service info event to negotiate encryption.
    if (filter.kinds?.includes(NIP47_INFO_KIND)) {
      queueMicrotask(() => {
        if (record.closed) return
        params.onevent?.(this.buildInfoEvent())
      })
    }

    return {
      close: () => {
        record.closed = true
        record.closeCount += 1
      },
    }
  }

  /** Mirrors the SDK's public `ReconnectingPool.publish`. */
  publish(
    relays: string[],
    event: { id: string; content: string },
  ): Promise<string>[] {
    void this.handlePublish(relays, event)

    if (this.rejectPublish) {
      return relays.map(() => Promise.reject(new Error('fake relay refused the event')))
    }
    return relays.map(() => Promise.resolve('fake-relay-ack'))
  }

  private async handlePublish(
    relays: string[],
    event: { id: string; content: string },
  ): Promise<void> {
    let plaintext = ''
    let method = ''
    let params: unknown = undefined

    try {
      plaintext = nostrTools.nip44.decrypt(event.content, this.conversationKey)
      const request = JSON.parse(plaintext) as { method?: string; params?: unknown }
      method = typeof request.method === 'string' ? request.method : ''
      params = request.params
    } catch {
      plaintext = ''
    }

    const record: FakeRecordedRequest = {
      method,
      params,
      eventId: event.id,
      relays,
      plaintext,
    }
    this.requests.push(record)

    // The fake wallet service answers the SDK handshake itself; every other method is
    // delegated to the test-controlled responder.
    const response =
      method === 'get_info'
        ? ({
            kind: 'envelope',
            envelope: {
              result_type: 'get_info',
              result: this.getInfoResult ?? { methods: DEFAULT_GET_INFO_CAPABILITIES },
            },
          } satisfies FakeResponse)
        : this.responder
          ? this.responder(method, record)
          : undefined
    if (!response || response.kind === 'none') return

    const body =
      response.kind === 'plaintext' ? response.plaintext : JSON.stringify(response.envelope)

    const signed = nostrTools.finalizeEvent(
      {
        kind: NIP47_RESPONSE_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', event.id],
          ['p', this.identity.clientPubkey],
        ],
        content: nostrTools.nip44.encrypt(body, this.conversationKey),
      },
      nostrTools.utils.hexToBytes(this.identity.walletSecret),
    )

    const deliver = () =>
      this.deliver(event.id, signed as unknown as { id: string; content: string })
    if (response.kind !== 'none' && response.delayMs && response.delayMs > 0) {
      setTimeout(deliver, response.delayMs)
    } else {
      deliver()
    }
  }

  /**
   * Deliver a response event to the subscription that asked for it. The `#e` filter holds the
   * id of the *request* event, so correlation uses the request id, not the response id.
   */
  private deliver(requestEventId: string, event: { id: string; content: string }): void {
    for (const record of this.subscriptions) {
      if (record.closed) continue
      if (!record.filter.kinds?.includes(NIP47_RESPONSE_KIND)) continue
      const expected = record.filter['#e']
      if (expected && !expected.includes(requestEventId)) continue
      record.params.onevent?.(event)
    }
  }

  private buildInfoEvent(): unknown {
    const content = DEFAULT_GET_INFO_CAPABILITIES.join(' ')
    const signed = nostrTools.finalizeEvent(
      {
        kind: NIP47_INFO_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['encryption', 'nip44_v2']],
        content,
      },
      nostrTools.utils.hexToBytes(this.identity.walletSecret),
    )
    return signed
  }
}

function urlOf(identity: FakeIdentity): string {
  return `wss://fake.invalid/${identity.clientPubkey.slice(0, 8)}`
}
