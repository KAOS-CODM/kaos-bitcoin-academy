import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  WalletError,
  describeWalletError,
} from '../../client/src/features/wallet/nwc.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const requireFromClient = createRequire(path.join(ROOT, 'client/package.json'))
const sdk = requireFromClient('@getalby/sdk/nwc') as {
  Nip47NetworkError: new (message: string, code: string) => Error
  Nip47PublishError: new (message: string, code: string) => Error
  Nip47PublishTimeoutError: new (message: string, code: string) => Error
  Nip47ReplyTimeoutError: new (message: string, code: string) => Error
  Nip47ResponseDecodingError: new (message: string, code: string) => Error
  Nip47ResponseValidationError: new (message: string, code: string) => Error
  Nip47UnsupportedEncryptionError: new (message: string, code: string) => Error
  Nip47WalletError: new (message: string, code: string) => Error
}

/**
 * The SDK's NIP-47 errors all report `name === 'Error'`, so the class name is the only
 * reliable way to tell a wallet-reported error apart from a local relay, transport, or
 * protocol failure.
 */
function sdkErrorClassName(error: unknown): string {
  if (typeof error !== 'object' || error === null) return ''
  const name = (error as { constructor?: { name?: unknown } }).constructor?.name
  return typeof name === 'string' ? name : ''
}

const REAL_ERRORS: Array<[string, Error]> = [
  ['Nip47ReplyTimeoutError', new sdk.Nip47ReplyTimeoutError('reply timeout: event <id>', 'INTERNAL')],
  [
    'Nip47PublishTimeoutError',
    new sdk.Nip47PublishTimeoutError('publish timeout: <id>', 'INTERNAL'),
  ],
  [
    'Nip47PublishError',
    new sdk.Nip47PublishError('failed to publish: wss://relay.example', 'INTERNAL', []),
  ],
  [
    'Nip47ResponseDecodingError',
    new sdk.Nip47ResponseDecodingError('failed to deserialize response', 'INTERNAL'),
  ],
  [
    'Nip47ResponseValidationError',
    new sdk.Nip47ResponseValidationError(
      'response from NWC failed validation: {"secret":"x"}',
      'INTERNAL',
    ),
  ],
  ['Nip47WalletError', new sdk.Nip47WalletError('wallet message', 'INTERNAL')],
  ['Nip47NetworkError', new sdk.Nip47NetworkError('Failed to connect to wss://relay.example', 'OTHER')],
  [
    'Nip47UnsupportedEncryptionError',
    new sdk.Nip47UnsupportedEncryptionError('no compatible encryption', 'UNSUPPORTED_ENCRYPTION'),
  ],
]

test('every real SDK error class is identified by its constructor name', () => {
  for (const [label, error] of REAL_ERRORS) {
    assert.equal(sdkErrorClassName(error), label)
    assert.equal(
      (error as { name?: string }).name,
      'Error',
      'the SDK does not set name, which is why the class name is required',
    )
  }
})

test('a local failure is never reported as a wallet-returned error', () => {
  const localFailures: Array<[string, Error]> = [
    ['Nip47ReplyTimeoutError', new sdk.Nip47ReplyTimeoutError('reply timeout', 'INTERNAL')],
    [
      'Nip47PublishTimeoutError',
      new sdk.Nip47PublishTimeoutError('publish timeout', 'INTERNAL'),
    ],
    ['Nip47PublishError', new sdk.Nip47PublishError('failed to publish', 'INTERNAL', [])],
    [
      'Nip47ResponseDecodingError',
      new sdk.Nip47ResponseDecodingError('failed to deserialize response', 'INTERNAL'),
    ],
    [
      'Nip47ResponseValidationError',
      new sdk.Nip47ResponseValidationError('response failed validation', 'INTERNAL'),
    ],
    ['Nip47NetworkError', new sdk.Nip47NetworkError('Failed to connect', 'OTHER')],
    [
      'Nip47UnsupportedEncryptionError',
      new sdk.Nip47UnsupportedEncryptionError('no compatible encryption', 'UNSUPPORTED_ENCRYPTION'),
    ],
  ]

  for (const [label, error] of localFailures) {
    const message = describeWalletError(error)
    assert.doesNotMatch(
      message,
      /The wallet returned/,
      `${label} is a local failure and must not be attributed to the wallet`,
    )
  }
})

test('each SDK failure class produces its own distinct description', () => {
  const descriptions = new Map<string, string>()

  for (const [label, error] of REAL_ERRORS) {
    const message = describeWalletError(error)
    assert.ok(message.length > 0, label)
    assert.equal(
      descriptions.has(message),
      false,
      `${label} must not share a description with another failure class`,
    )
    descriptions.set(message, label)
  }
})

test('an INTERNAL-coded timeout is not described as a wallet-returned error', () => {
  const timeout = new sdk.Nip47ReplyTimeoutError('reply timeout: event <id>', 'INTERNAL')
  assert.equal((timeout as { code?: string }).code, 'INTERNAL')

  const message = describeWalletError(timeout)
  assert.doesNotMatch(message, /The wallet returned/)
  assert.match(message, /did not answer in time/i)
})

test('a genuine wallet error still reports the wallet code', () => {
  const walletError = new sdk.Nip47WalletError('wallet message', 'PAYMENT_FAILED')
  const message = describeWalletError(walletError)

  assert.match(message, /The wallet returned PAYMENT_FAILED/)
  assert.doesNotMatch(message, /wallet message/)
})

test('a wallet error with an unknown code does not echo the wallet message', () => {
  const walletError = new sdk.Nip47WalletError(
    'sensitive wallet detail',
    'SOMETHING_UNKNOWN',
  )
  const message = describeWalletError(walletError)

  assert.doesNotMatch(message, /sensitive wallet detail/)
  assert.doesNotMatch(message, /SOMETHING_UNKNOWN/)
  assert.match(message, /The wallet reported an error/)
})

test('no rendered description leaks SDK error content', () => {
  const sensitive = 'wss://relay.example/<event-id> {"secret":"value"}'

  for (const [label, error] of REAL_ERRORS) {
    const message = describeWalletError(error)
    assert.equal(message.includes(sensitive), false, label)
    assert.equal(message.includes('relay.example'), false, label)
    assert.equal(message.includes('event-id'), false, label)
  }
})

test('non-SDK errors keep the existing safe fallbacks', () => {
  const raw = 'raw connection material that must not be displayed'

  const syntheticTimeout = Object.assign(new Error(raw), { name: 'Nip47ReplyTimeoutError' })
  assert.match(describeWalletError(syntheticTimeout), /timeout/i)
  assert.equal(describeWalletError(syntheticTimeout).includes(raw), false)

  const coded = Object.assign(new Error(raw), { code: 'UNAUTHORIZED' })
  assert.match(describeWalletError(coded), /UNAUTHORIZED/)
  assert.equal(describeWalletError(coded).includes(raw), false)

  const generic = describeWalletError(new Error(raw))
  assert.equal(generic.includes(raw), false)
  assert.match(generic, /did not log your connection URI or secret/)
})

test('an application validation error is still shown verbatim', () => {
  const message = describeWalletError(
    new WalletError('Only wss://relay.coinos.io or wss://relay.getalby.com/v1 is accepted.'),
  )
  assert.match(
    message,
    /Only wss:\/\/relay\.coinos\.io or wss:\/\/relay\.getalby\.com\/v1 is accepted\./,
  )
})
