import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  ACCOUNT_TRANSACTION_LIMIT,
  classifyAccountFailure,
  deriveAccountDiagnostic,
  describeCapabilities,
  formatBtc,
  formatSats,
  requestAccountBalance,
  requestAccountInfo,
  requestAccountTransactions,
  sanitizeBalanceResponse,
  sanitizeTransactionList,
  type AccountConnectionState,
  type AccountFailure,
  type AccountRequester,
  type WalletAccountSnapshot,
} from '../../client/src/features/wallet/account.ts'
import {
  WalletAccountDashboard,
  WalletDashboard,
} from '../../client/src/features/wallet/WalletAccountDashboard.tsx'
import type {
  Nip47EnvelopeMethod,
  Nip47RequestResult,
} from '../../client/src/features/wallet/nwc-envelope.ts'
import {
  Nip47EnvelopeAdapter,
  type Nip47Transport,
} from '../../client/src/features/wallet/nwc-envelope.ts'
import { APPROVED_RELAYS, COINOS_RELAY } from '../../client/src/features/wallet/nwc.ts'
import {
  FakeNip47Pool,
  type FakeIdentity,
} from './fixtures/nip47-fake-relay.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const requireFromClient = createRequire(path.join(ROOT, 'client/package.json'))
const React = requireFromClient('react')
const { renderToStaticMarkup } = requireFromClient('react-dom/server')

// tsx transpiles the imported client components with the classic JSX runtime in the server
// test runner. Expose the same React instance it should use.
;(globalThis as { React?: unknown }).React = React

const PAYMENT_HASH = 'a'.repeat(64)
const INVOICE_TEXT = 'lnbc1p3xnhs2sppp5rvczvsq2wfav09z5s0s0xrxg9m0v9js0m0v9js0m0v9js0mq'
const PREIMAGE = 'b'.repeat(64)
const SECRET = 'c'.repeat(64)

interface RecordedCall {
  method: Nip47EnvelopeMethod
  params: unknown
}

/** A fake requester that records every call and returns a scripted result. */
function createRequester(result: Nip47RequestResult) {
  const calls: RecordedCall[] = []
  return {
    calls,
    async requestEnvelope(method: Nip47EnvelopeMethod, params: unknown) {
      calls.push({ method, params })
      return result
    },
  }
}

/** A requester that answers each method with its own scripted result. */
function createMethodRequester(results: Partial<Record<string, Nip47RequestResult>>) {
  const calls: RecordedCall[] = []
  return {
    calls,
    async requestEnvelope(method: Nip47EnvelopeMethod, params: unknown) {
      calls.push({ method, params })
      return results[method] ?? { status: 'failed', kind: 'not-submitted' }
    },
  }
}

function ok(result: unknown): Nip47RequestResult {
  return { status: 'ok', result }
}

function walletError(code: string): Nip47RequestResult {
  return { status: 'failed', kind: 'wallet-error', code }
}

// ---------------------------------------------------------------------------
// The request helpers
// ---------------------------------------------------------------------------

test('a manual get_info request returns the sanitized wallet information', async () => {
  const requester = createRequester(
    ok({
      alias: 'Example wallet',
      network: 'mainnet',
      methods: ['get_info', 'get_balance'],
      secret: 'must-not-appear',
      unexpected: 'must-not-appear',
    }),
  )

  const outcome = await requestAccountInfo(requester, { now: () => 1_700_000_000_000 })

  assert.equal(requester.calls.length, 1)
  assert.equal(requester.calls[0].method, 'get_info')
  assert.deepEqual(requester.calls[0].params, {})

  assert.equal(outcome.status, 'ok')
  if (outcome.status !== 'ok') return
  assert.equal(outcome.value.alias, 'Example wallet')
  assert.equal(outcome.value.network, 'mainnet')
  assert.deepEqual(outcome.value.methods, ['get_info', 'get_balance'])
  assert.equal('secret' in outcome.value, false)
  assert.equal('unexpected' in outcome.value, false)
  assert.equal(outcome.receivedAt, 1_700_000_000_000)
})

test('a manual balance request returns the balance the wallet reported', async () => {
  const requester = createRequester(ok({ balance: 21_000_000 }))

  const outcome = await requestAccountBalance(requester, { now: () => 1_700_000_000_000 })

  assert.equal(requester.calls.length, 1)
  assert.equal(requester.calls[0].method, 'get_balance')
  assert.deepEqual(requester.calls[0].params, {})

  assert.equal(outcome.status, 'ok')
  if (outcome.status !== 'ok') return
  assert.equal(outcome.value.balanceMsat, 21_000_000)
  assert.equal(outcome.value.balanceSats, 21_000)
  assert.equal(outcome.receivedAt, 1_700_000_000_000)
})

test('a failed balance request produces no balance at all', async () => {
  const requester = createRequester({ status: 'failed', kind: 'timeout' })

  const outcome = await requestAccountBalance(requester)

  assert.equal(outcome.status, 'failed')
  if (outcome.status !== 'failed') return
  assert.equal(outcome.failure.category, 'transport-failure')
  assert.equal('value' in outcome, false)
})

test('an unsupported get_balance is reported as an unsupported operation', async () => {
  const requester = createRequester(walletError('NOT_IMPLEMENTED'))

  const outcome = await requestAccountBalance(requester)

  assert.equal(outcome.status, 'failed')
  if (outcome.status !== 'failed') return
  assert.equal(outcome.failure.category, 'unsupported-operation')
  assert.equal(outcome.failure.retryable, false)
})

test('a successful transaction history request returns only the wallet records', async () => {
  const requester = createRequester(
    ok({
      transactions: [
        {
          type: 'incoming',
          state: 'settled',
          amount: 21_000_000,
          created_at: 1_700_000_000,
          payment_hash: PAYMENT_HASH,
          description: 'Practice payment',
        },
      ],
    }),
  )

  const outcome = await requestAccountTransactions(requester)

  assert.equal(requester.calls.length, 1)
  assert.equal(requester.calls[0].method, 'list_transactions')
  assert.deepEqual(requester.calls[0].params, { limit: ACCOUNT_TRANSACTION_LIMIT })

  assert.equal(outcome.status, 'ok')
  if (outcome.status !== 'ok') return
  assert.equal(outcome.value.length, 1)
  assert.equal(outcome.value[0].type, 'incoming')
  assert.equal(outcome.value[0].amountSats, 21_000)
  assert.equal(outcome.value[0].state, 'settled')
  assert.equal(outcome.value[0].createdAt, 1_700_000_000)
  assert.equal(outcome.value[0].paymentHashRef, `${PAYMENT_HASH.slice(0, 16)}…`)
  assert.equal(outcome.value[0].description, 'Practice payment')
})

test('an empty transaction history is an empty list, not a failure and not invented rows', async () => {
  const requester = createRequester(ok({ transactions: [] }))

  const outcome = await requestAccountTransactions(requester)

  assert.equal(outcome.status, 'ok')
  if (outcome.status !== 'ok') return
  assert.deepEqual(outcome.value, [])
})

test('an unsupported list_transactions is reported as an unsupported operation', async () => {
  const requester = createRequester(walletError('NOT_IMPLEMENTED'))

  const outcome = await requestAccountTransactions(requester)

  assert.equal(outcome.status, 'failed')
  if (outcome.status !== 'failed') return
  assert.equal(outcome.failure.category, 'unsupported-operation')
})

test('a disconnected wallet session is reported as an expired session', async () => {
  const requester = createRequester({ status: 'failed', kind: 'stale' })

  const outcome = await requestAccountBalance(requester)

  assert.equal(outcome.status, 'failed')
  if (outcome.status !== 'failed') return
  assert.equal(outcome.failure.category, 'session-expired')
  assert.match(outcome.failure.message, /Reconnect the wallet/)
})

test('permission and authorization errors are reported as a missing permission', async () => {
  for (const code of ['UNAUTHORIZED', 'RESTRICTED', 'QUOTA_EXCEEDED']) {
    const outcome = await requestAccountBalance(createRequester(walletError(code)))

    assert.equal(outcome.status, 'failed')
    if (outcome.status !== 'failed') continue
    assert.equal(outcome.failure.category, 'permission-missing', code)
    assert.equal(outcome.failure.retryable, false)
  }
})

test('a wallet-reported insufficient balance is never confused with anything else', async () => {
  const outcome = await requestAccountBalance(createRequester(walletError('INSUFFICIENT_BALANCE')))

  assert.equal(outcome.status, 'failed')
  if (outcome.status !== 'failed') return
  assert.equal(outcome.failure.category, 'insufficient-balance')
  assert.match(outcome.failure.message, /explicitly reported/)
  assert.doesNotMatch(outcome.failure.message, /insufficient funds/i)
})

test('the failure categories stay separate from one another', () => {
  const categories = [
    classifyAccountFailure('wallet-error', 'UNAUTHORIZED').category,
    classifyAccountFailure('wallet-error', 'NOT_IMPLEMENTED').category,
    classifyAccountFailure('wallet-error', 'INSUFFICIENT_BALANCE').category,
    classifyAccountFailure('stale').category,
    classifyAccountFailure('timeout').category,
    classifyAccountFailure('not-submitted').category,
    classifyAccountFailure('invalid-envelope').category,
  ]

  assert.deepEqual(categories, [
    'permission-missing',
    'unsupported-operation',
    'insufficient-balance',
    'session-expired',
    'transport-failure',
    'transport-failure',
    'invalid-response',
  ])
  assert.equal(new Set(categories).size, 6)
})

test('an unknown wallet error code is never echoed back to the learner', () => {
  const failure = classifyAccountFailure('wallet-error', 'wss://rogue.example secret-text')

  assert.equal(failure.category, 'wallet-error')
  assert.equal(failure.message.includes('rogue.example'), false)
  assert.equal(failure.message.includes('secret-text'), false)
})

test('a malformed wallet reply never becomes a balance or a transaction record', () => {
  assert.equal(sanitizeBalanceResponse({}), null)
  assert.equal(sanitizeBalanceResponse({ balance: '1000' }), null)
  assert.equal(sanitizeBalanceResponse({ balance: -1 }), null)
  assert.equal(sanitizeBalanceResponse({ balance: 1.5 }), null)
  assert.equal(sanitizeBalanceResponse(null), null)

  assert.equal(sanitizeTransactionList({}), null)
  assert.equal(sanitizeTransactionList({ transactions: 'nope' }), null)

  const transactions = sanitizeTransactionList({
    transactions: [
      { type: 'incoming', amount: 1_000 },
      { type: 'sideways', amount: 1_000 },
      { type: 'outgoing', amount: 'lots' },
      { amount: 1_000 },
    ],
  })

  assert.deepEqual(transactions, [
    { type: 'incoming', amountMsat: 1_000, amountSats: 1 },
  ])
})

test('the transaction history never carries a preimage or a full invoice', () => {
  const transactions = sanitizeTransactionList({
    transactions: [
      {
        type: 'incoming',
        amount: 1_000,
        preimage: PREIMAGE,
        invoice: INVOICE_TEXT,
        payment_hash: PAYMENT_HASH,
      },
    ],
  })

  assert.ok(transactions)
  assert.equal(transactions.length, 1)
  assert.equal(JSON.stringify(transactions).includes(PREIMAGE), false)
  assert.equal(JSON.stringify(transactions).includes(INVOICE_TEXT), false)
  assert.equal(transactions[0].paymentHashRef, `${PAYMENT_HASH.slice(0, 16)}…`)
})

test('a reported method is never assumed to work', () => {
  const capabilities = describeCapabilities({
    reported: ['get_info', 'get_balance', 'list_transactions'],
    verified: ['get_info'],
    failures: { get_balance: 'Temporary relay or transport failure' },
  })

  const byMethod = new Map(capabilities.map((entry) => [entry.method, entry]))

  assert.equal(byMethod.get('get_info')?.state, 'reported-and-verified')
  assert.equal(byMethod.get('get_balance')?.state, 'reported-but-unavailable')
  assert.match(byMethod.get('get_balance')?.detail ?? '', /did not succeed/)
  assert.equal(byMethod.get('list_transactions')?.state, 'reported')
  assert.match(byMethod.get('list_transactions')?.detail ?? '', /has not called it/)
  assert.equal(byMethod.get('pay_invoice')?.state, 'not-reported')
  assert.match(byMethod.get('pay_invoice')?.detail ?? '', /did not report this method/)
})

test('the diagnostics keep every failure mode apart', () => {
  const failure = (category: AccountFailure['category']): AccountFailure => ({
    category,
    title: 'Title',
    message: 'Message',
    retryable: true,
  })

  const permission = deriveAccountDiagnostic({
    connection: 'connected',
    infoAvailable: true,
    balanceAvailable: false,
    failures: [failure('permission-missing')],
  })
  const unsupported = deriveAccountDiagnostic({
    connection: 'connected',
    infoAvailable: true,
    balanceAvailable: false,
    failures: [failure('unsupported-operation')],
  })
  const insufficient = deriveAccountDiagnostic({
    connection: 'connected',
    infoAvailable: true,
    balanceAvailable: false,
    failures: [failure('insufficient-balance')],
  })
  const expired = deriveAccountDiagnostic({
    connection: 'connected',
    infoAvailable: true,
    balanceAvailable: false,
    failures: [failure('session-expired')],
  })
  const transport = deriveAccountDiagnostic({
    connection: 'connected',
    infoAvailable: true,
    balanceAvailable: false,
    failures: [failure('transport-failure')],
  })
  const responding = deriveAccountDiagnostic({
    connection: 'connected',
    infoAvailable: true,
    balanceAvailable: true,
    failures: [],
  })
  const disconnected = deriveAccountDiagnostic({
    connection: 'disconnected',
    infoAvailable: false,
    balanceAvailable: false,
    failures: [],
  })
  const connectionError = deriveAccountDiagnostic({
    connection: 'error',
    infoAvailable: false,
    balanceAvailable: false,
    failures: [],
  })

  assert.deepEqual(
    [
      permission.kind,
      unsupported.kind,
      insufficient.kind,
      expired.kind,
      transport.kind,
      responding.kind,
      disconnected.kind,
      connectionError.kind,
    ],
    [
      'permission-missing',
      'unsupported-operation',
      'insufficient-balance',
      'session-expired',
      'transport-failure',
      'connected-responding',
      'no-connection',
      'connection-error',
    ],
  )
})

test('a connected wallet with no completed request is not reported as responding', () => {
  const diagnostic = deriveAccountDiagnostic({
    connection: 'connected',
    infoAvailable: false,
    balanceAvailable: false,
    failures: [],
  })

  assert.equal(diagnostic.kind, 'connected-unverified')
})

test('the balance is formatted for reading without changing its value', () => {
  assert.equal(formatSats(21_000), '21,000')
  assert.equal(formatSats(0), '0')
  assert.equal(formatSats(1_234_567), '1,234,567')
  assert.equal(formatSats(1.5), '1.5')
  assert.equal(formatBtc(21_000), '0.00021000')
  assert.equal(formatBtc(100_000_000), '1.00000000')
})

// ---------------------------------------------------------------------------
// The rendered dashboard
// ---------------------------------------------------------------------------

function buildSnapshot(overrides: Partial<WalletAccountSnapshot> = {}): WalletAccountSnapshot {
  return {
    connection: 'connected',
    reportedMethods: ['get_info', 'get_balance', 'list_transactions'],
    verifiedMethods: ['get_info'],
    methodFailures: {},
    info: {
      alias: 'Example wallet',
      network: 'mainnet',
      methods: ['get_info', 'get_balance', 'list_transactions'],
    },
    infoRefreshedAt: 1_700_000_000_000,
    infoFailure: null,
    balance: null,
    balanceCheckedAt: null,
    balanceFailure: null,
    transactions: null,
    historyRequestedAt: null,
    historyFailure: null,
    busy: { info: false, balance: false, history: false },
    ...overrides,
  }
}

function renderDashboard(overrides: Partial<WalletAccountSnapshot> = {}): string {
  return renderToStaticMarkup(
    React.createElement(WalletAccountDashboard as never, {
      snapshot: buildSnapshot(overrides),
      onRefreshInfo: () => {},
      onCheckBalance: () => {},
      onLoadTransactions: () => {},
    } as never),
  )
}

test('the dashboard reports a disconnected wallet without inventing an account', () => {
  const html = renderDashboard({
    connection: 'disconnected',
    reportedMethods: [],
    verifiedMethods: [],
    info: null,
    infoRefreshedAt: null,
  })

  assert.match(html, /Connection state/)
  assert.match(html, /Disconnected/)
  assert.match(html, /No wallet connected/)
  assert.match(html, /Connect a wallet above to read a balance\./)
  assert.doesNotMatch(html, /\d[\d,.]* sats/)
  assert.equal(html.includes('Last successful balance check'), false)
})

test('the dashboard shows the balance the wallet reported and when it was checked', () => {
  const html = renderDashboard({
    balance: { balanceMsat: 21_000_000, balanceSats: 21_000 },
    balanceCheckedAt: 1_700_000_000_000,
  })

  assert.match(html, /Last successful balance check/)
  assert.match(html, /21,000 sats/)
  assert.match(html, /0\.00021000 BTC/)
  assert.match(html, /Reported by the wallet at/)
})

test('a failed balance request is not shown as a zero balance', () => {
  const html = renderDashboard({
    balance: null,
    balanceFailure: {
      category: 'transport-failure',
      title: 'Temporary relay or transport failure',
      message: 'The request did not reach the wallet service through the approved relay.',
      retryable: true,
    },
  })

  assert.match(html, /Temporary relay or transport failure/)
  assert.match(html, /Try the balance request again/)
  assert.doesNotMatch(html, /\b0 sats/)
  assert.equal(html.includes('Last successful balance check'), false)
})

test('a balance that a later failure made stale is still labelled as the last successful check', () => {
  const html = renderDashboard({
    balance: { balanceMsat: 21_000_000, balanceSats: 21_000 },
    balanceCheckedAt: 1_700_000_000_000,
    balanceFailure: {
      category: 'transport-failure',
      title: 'Temporary relay or transport failure',
      message: 'The request did not reach the wallet service through the approved relay.',
      retryable: true,
    },
  })

  assert.match(html, /Last successful balance check/)
  assert.match(html, /21,000 sats/)
  assert.match(
    html,
    /The most recent balance request did not succeed, so this is the last check that did\./,
  )
})

test('an unsupported get_balance is explained instead of offering the request', () => {
  const html = renderDashboard({ reportedMethods: ['get_info'] })

  assert.match(html, /does not report the <code>get_balance<\/code> method/)
  assert.equal(html.includes('Check balance'), false)
})

test('an empty transaction history is shown as an empty history', () => {
  const html = renderDashboard({ transactions: [], historyRequestedAt: 1_700_000_000_000 })

  assert.match(html, /The wallet returned no transactions for this request\./)
  assert.match(html, /That is an empty history, not a failure\./)
})

test('an unsupported list_transactions is explained instead of offering the request', () => {
  const html = renderDashboard({ reportedMethods: ['get_info', 'get_balance'] })

  assert.match(html, /does not report the <code>list_transactions<\/code> method/)
  assert.equal(html.includes('Load transaction history'), false)
})

test('the transaction list shows the wallet records and never a preimage or invoice', () => {
  const html = renderDashboard({
    transactions: [
      {
        type: 'incoming',
        amountMsat: 21_000_000,
        amountSats: 21_000,
        state: 'settled',
        createdAt: 1_700_000_000,
        paymentHashRef: `${PAYMENT_HASH.slice(0, 16)}…`,
        description: 'Practice payment',
      },
    ],
    historyRequestedAt: 1_700_000_000_000,
  })

  assert.match(html, /Incoming/)
  assert.match(html, /21,000 sats/)
  assert.match(html, /settled/)
  assert.match(html, /Practice payment/)
  assert.match(html, /Last successful history request/)
  assert.equal(html.includes(PREIMAGE), false)
  assert.equal(html.includes(INVOICE_TEXT), false)
  assert.equal(html.includes(PAYMENT_HASH), false)
})

test('the capability list separates reported, tested, and unavailable operations', () => {
  const html = renderDashboard({
    reportedMethods: ['get_info', 'get_balance'],
    verifiedMethods: ['get_info', 'get_balance'],
    methodFailures: {},
  })

  assert.match(html, /Methods reported by the connected wallet/)
  assert.match(html, /Operations unavailable to this connection/)
  assert.match(html, /Reported and tested/)
  assert.match(html, /Not reported/)
  assert.match(
    html,
    /The wallet reports this method, and a request for it succeeded in this session\./,
  )
})

test('the diagnostics show the connected and responding state', () => {
  const html = renderDashboard({
    balance: { balanceMsat: 1_000, balanceSats: 1 },
    balanceCheckedAt: 1_700_000_000_000,
  })

  assert.match(html, /Account diagnostics/)
  assert.match(html, /Connected and responding/)
})

test('the diagnostics show a missing permission, an unsupported operation, an insufficient balance, an expired session, and a transport failure separately', () => {
  const cases: Array<[AccountFailure, RegExp]> = [
    [
      {
        category: 'permission-missing',
        title: 'Required permission missing',
        message: 'The wallet refused this request because the connection is not authorized for it.',
        retryable: false,
      },
      /Required permission missing/,
    ],
    [
      {
        category: 'unsupported-operation',
        title: 'Operation not supported by this wallet',
        message: 'The wallet reported that it does not support this operation on this connection.',
        retryable: false,
      },
      /Operation not supported by this wallet/,
    ],
    [
      {
        category: 'insufficient-balance',
        title: 'The wallet reports an insufficient balance',
        message: 'The wallet explicitly reported that the available balance is not enough.',
        retryable: false,
      },
      /The wallet reports an insufficient balance/,
    ],
    [
      {
        category: 'session-expired',
        title: 'Session expired or disconnected',
        message: 'The wallet connection closed before the reply arrived.',
        retryable: true,
      },
      /Session expired or disconnected/,
    ],
    [
      {
        category: 'transport-failure',
        title: 'Temporary relay or transport failure',
        message: 'The request did not reach the wallet service through the approved relay.',
        retryable: true,
      },
      /Temporary relay or transport failure/,
    ],
  ]

  for (const [failure, expected] of cases) {
    const html = renderDashboard({ balanceFailure: failure })
    assert.match(html, expected)
  }
})

test('the dashboard never claims that a connected wallet holds funds', () => {
  const html = renderDashboard()

  assert.doesNotMatch(html, /wallet is funded/i)
  assert.doesNotMatch(html, /your wallet (is|holds) (funded|funds)/i)
  assert.doesNotMatch(html, /is payment[- ]ready/i)
  assert.doesNotMatch(html, /ready to (pay|receive)/i)
  assert.match(html, /A connected wallet is not a funded wallet/)
})

// ---------------------------------------------------------------------------
// The container: manual requests only
// ---------------------------------------------------------------------------

interface CapturedElement {
  type: unknown
  props: Record<string, unknown>
}

function textOf(children: unknown): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(textOf).join(' ')
  return ''
}

/**
 * Render the container and capture every element it creates, so a manual control can be
 * activated the same way a learner would activate it.
 */
function renderContainerCapturing(
  element: unknown,
): { html: string; elements: CapturedElement[] } {
  const captured: CapturedElement[] = []
  const original = React.createElement
  React.createElement = ((type: unknown, props: Record<string, unknown> | null, ...rest: unknown[]) => {
    const created = original(type, props, ...rest)
    // The created element carries the resolved props, including the children that the
    // classic runtime moves out of the argument list.
    captured.push({
      type,
      props: ((created as { props?: Record<string, unknown> })?.props ?? {}) as Record<
        string,
        unknown
      >,
    })
    return created
  }) as typeof React.createElement

  try {
    const html = renderToStaticMarkup(element as never)
    return { html, elements: captured }
  } finally {
    React.createElement = original
  }
}

function findButton(elements: CapturedElement[], label: string): CapturedElement | undefined {
  return elements.find(
    (entry) =>
      entry.type === 'button' && textOf(entry.props.children).includes(label),
  )
}

function buildContainer(requester: AccountRequester | null, overrides: Record<string, unknown> = {}) {
  return React.createElement(WalletDashboard as never, {
    methods: ['get_info', 'get_balance', 'list_transactions'],
    info: {
      alias: 'Example wallet',
      network: 'mainnet',
      methods: ['get_info', 'get_balance', 'list_transactions'],
    },
    infoRefreshedAt: 1_700_000_000_000,
    connection: 'connected' as AccountConnectionState,
    requester,
    onInfoRefreshed: () => {},
    ...overrides,
  } as never)
}

test('the dashboard issues no wallet request when it is mounted', () => {
  const requester = createMethodRequester({
    get_info: ok({ alias: 'Example wallet', methods: ['get_info'] }),
    get_balance: ok({ balance: 1_000 }),
    list_transactions: ok({ transactions: [] }),
  })

  renderContainerCapturing(buildContainer(requester))

  assert.deepEqual(requester.calls, [])
})

test('the dashboard issues no wallet request when it is mounted without a wallet', () => {
  const requester = createMethodRequester({})

  renderContainerCapturing(buildContainer(requester, { requester: null }))

  assert.deepEqual(requester.calls, [])
})

test('one manual balance activation issues exactly one get_balance request', async () => {
  const requester = createMethodRequester({ get_balance: ok({ balance: 21_000_000 }) })
  const { elements } = renderContainerCapturing(buildContainer(requester))

  const button = findButton(elements, 'Check balance')
  assert.ok(button, 'the balance control should be rendered')

  const onClick = button.props.onClick as () => void
  onClick()
  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(requester.calls.length, 1)
  assert.equal(requester.calls[0].method, 'get_balance')
  assert.deepEqual(requester.calls[0].params, {})
})

test('one manual history activation issues exactly one list_transactions request with a bounded limit', async () => {
  const requester = createMethodRequester({ list_transactions: ok({ transactions: [] }) })
  const { elements } = renderContainerCapturing(buildContainer(requester))

  const button = findButton(elements, 'Load transaction history')
  assert.ok(button, 'the transaction history control should be rendered')

  const onClick = button.props.onClick as () => void
  onClick()
  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(requester.calls.length, 1)
  assert.equal(requester.calls[0].method, 'list_transactions')
  assert.deepEqual(requester.calls[0].params, { limit: ACCOUNT_TRANSACTION_LIMIT })
})

test('one manual information activation issues exactly one get_info request', async () => {
  const requester = createMethodRequester({
    get_info: ok({ alias: 'Example wallet', methods: ['get_info'] }),
  })
  const { elements } = renderContainerCapturing(buildContainer(requester))

  const button = findButton(elements, 'Refresh wallet information')
  assert.ok(button, 'the wallet information control should be rendered')

  const onClick = button.props.onClick as () => void
  onClick()
  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(requester.calls.length, 1)
  assert.equal(requester.calls[0].method, 'get_info')
  assert.deepEqual(requester.calls[0].params, {})
})

test('the dashboard never calls a payment method', async () => {
  const requester = createMethodRequester({
    get_info: ok({ alias: 'Example wallet', methods: ['get_info'] }),
    get_balance: ok({ balance: 1_000 }),
    list_transactions: ok({ transactions: [] }),
  })
  const { elements } = renderContainerCapturing(buildContainer(requester))

  for (const label of [
    'Refresh wallet information',
    'Check balance',
    'Load transaction history',
  ]) {
    const button = findButton(elements, label)
    assert.ok(button, `${label} should be rendered`)
    ;(button.props.onClick as () => void)()
  }

  await new Promise((resolve) => setTimeout(resolve, 0))

  for (const call of requester.calls) {
    assert.notEqual(call.method, 'pay_invoice')
    assert.notEqual(call.method, 'make_invoice')
    assert.notEqual(call.method, 'lookup_invoice')
  }
  assert.equal(requester.calls.length, 3)
})

// ---------------------------------------------------------------------------
// The strict envelope adapter with the new account methods
// ---------------------------------------------------------------------------

const nostrTools = requireFromClient('nostr-tools') as {
  nip44: {
    getConversationKey(privkeyA: Uint8Array, pubkeyB: string): Uint8Array
    encrypt(plaintext: string, conversationKey: Uint8Array): string
    decrypt(payload: string, conversationKey: Uint8Array): string
  }
  utils: {
    hexToBytes(hex: string): Uint8Array
  }
  getPublicKey(secret: Uint8Array): string
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

function buildFakeIdentity(): FakeIdentity {
  const clientSecret = '11'.repeat(32)
  const walletSecret = '22'.repeat(32)
  return {
    clientSecret,
    walletSecret,
    walletPubkey: nostrTools.getPublicKey(nostrTools.utils.hexToBytes(walletSecret)),
    clientPubkey: nostrTools.getPublicKey(nostrTools.utils.hexToBytes(clientSecret)),
  }
}

/**
 * Build a transport backed by the in-memory fake wallet service.
 *
 * No socket is opened and no relay or wallet is contacted: the fake pool answers the
 * published request itself.
 */
function buildFakeTransport(identity: FakeIdentity, pool: FakeNip47Pool): Nip47Transport {
  const conversationKey = nostrTools.nip44.getConversationKey(
    nostrTools.utils.hexToBytes(identity.walletSecret),
    identity.clientPubkey,
  )

  return {
    relayUrls: [COINOS_RELAY],
    walletPubkey: identity.walletPubkey,
    encryptionType: 'nip44_v2',
    async encrypt(_pubkey: string, content: string): Promise<unknown> {
      return nostrTools.nip44.encrypt(content, conversationKey)
    },
    async decrypt(_pubkey: string, content: string): Promise<string> {
      return nostrTools.nip44.decrypt(content, conversationKey)
    },
    async signEvent(template: {
      kind: number
      created_at: number
      tags: string[][]
      content: string
    }) {
      return nostrTools.finalizeEvent(
        template,
        nostrTools.utils.hexToBytes(identity.clientSecret),
      ) as never
    },
    pool: pool as never,
  }
}

async function requestThroughFake(
  method: Nip47EnvelopeMethod,
  params: unknown,
  envelope: Record<string, unknown>,
  getInfoResult?: unknown,
): Promise<{ result: Nip47RequestResult; pool: FakeNip47Pool }> {
  const identity = buildFakeIdentity()
  const pool = new FakeNip47Pool({
    identity,
    responder: () => ({ kind: 'envelope', envelope }),
    getInfoResult,
  })

  const adapter = new Nip47EnvelopeAdapter({
    transport: buildFakeTransport(identity, pool),
    allowedRelays: APPROVED_RELAYS,
    replyTimeoutMs: 2000,
  })

  const result = await adapter.request(method, params)
  return { result, pool }
}

test('the strict adapter accepts a valid get_balance response', async () => {
  const { result, pool } = await requestThroughFake('get_balance', {}, {
    result_type: 'get_balance',
    result: { balance: 21_000_000 },
  })

  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') return
  assert.deepEqual(result.result, { balance: 21_000_000 })

  const request = pool.requests.find((entry) => entry.method === 'get_balance')
  assert.ok(request, 'the fake wallet service should have received the get_balance request')
  assert.deepEqual(request.relays, [COINOS_RELAY])
})

test('the strict adapter rejects a get_balance response with the wrong result_type', async () => {
  const { result } = await requestThroughFake('get_balance', {}, {
    result_type: 'get_info',
    result: { balance: 21_000_000 },
  })

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

test('the strict adapter rejects a get_balance response without a balance', async () => {
  const { result } = await requestThroughFake('get_balance', {}, {
    result_type: 'get_balance',
    result: { pending: 1 },
  })

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

test('the strict adapter accepts a valid list_transactions response', async () => {
  const { result, pool } = await requestThroughFake(
    'list_transactions',
    { limit: ACCOUNT_TRANSACTION_LIMIT },
    {
      result_type: 'list_transactions',
      result: {
        transactions: [{ type: 'incoming', amount: 21_000_000, created_at: 1_700_000_000 }],
      },
    },
  )

  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') return
  assert.equal((result.result as { transactions: unknown[] }).transactions.length, 1)

  const request = pool.requests.find((entry) => entry.method === 'list_transactions')
  assert.ok(request)
  assert.deepEqual(request.params, { limit: ACCOUNT_TRANSACTION_LIMIT })
})

test('the strict adapter rejects a list_transactions response without a transactions array', async () => {
  const { result } = await requestThroughFake('list_transactions', { limit: 20 }, {
    result_type: 'list_transactions',
    result: { total_count: 3 },
  })

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

test('the strict adapter accepts a valid get_info response', async () => {
  const { result } = await requestThroughFake(
    'get_info',
    {},
    {
      result_type: 'get_info',
      result: { alias: 'Example wallet', methods: ['get_info', 'get_balance'] },
    },
    { alias: 'Example wallet', methods: ['get_info', 'get_balance'] },
  )

  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') return
  assert.deepEqual(result.result, {
    alias: 'Example wallet',
    methods: ['get_info', 'get_balance'],
  })
})

test('the strict adapter rejects a get_info response without a methods list', async () => {
  const { result } = await requestThroughFake(
    'get_info',
    {},
    {
      result_type: 'get_info',
      result: { alias: 'Example wallet' },
    },
    { alias: 'Example wallet' },
  )

  assert.deepEqual(result, { status: 'failed', kind: 'invalid-envelope' })
})

// ---------------------------------------------------------------------------
// The new modules keep the wallet safety rules
// ---------------------------------------------------------------------------

const ACCOUNT_MODULES = [
  'client/src/features/wallet/account.ts',
  'client/src/features/wallet/WalletAccountDashboard.tsx',
]

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

test('the account dashboard modules keep credentials and wallet data out of storage and the network', () => {
  const source = ACCOUNT_MODULES.map(read).join('\n')

  for (const marker of [
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'document.cookie',
    'location.search',
    'location.hash',
    'history.pushState',
    'fetch(',
    'XMLHttpRequest',
    'navigator.sendBeacon',
    '/api/',
    'WebSocket(',
  ]) {
    assert.equal(source.includes(marker), false, `account source must not contain ${marker}`)
  }
})

test('the account dashboard modules never emit console output', () => {
  const source = ACCOUNT_MODULES.map(read).join('\n')

  for (const marker of [
    'console.log(',
    'console.info(',
    'console.warn(',
    'console.error(',
    'console.debug(',
  ]) {
    assert.equal(source.includes(marker), false, `account source must not emit ${marker}`)
  }
})

test('the account dashboard modules never hardcode a relay outside the approved allowlist', () => {
  const source = ACCOUNT_MODULES.map(read).join('\n')
  const urls = source.match(/wss:\/\/[^\s'"`)]+/g) ?? []

  for (const url of urls) {
    assert.ok(
      APPROVED_RELAYS.some((relay) => url.startsWith(relay)),
      `account source must not reference an unapproved relay: ${url}`,
    )
  }
})

test('the account dashboard modules never poll and never schedule a background request', () => {
  const source = ACCOUNT_MODULES.map(read).join('\n')

  assert.equal(source.includes('setInterval'), false)
  assert.equal(source.includes('setTimeout'), false)
  assert.equal(source.includes('requestAnimationFrame'), false)
  // The only effect invalidates a pending response when the page goes away.
  assert.equal(/useEffect\([\s\S]{0,400}?requestEnvelope/.test(source), false)
})

test('the account dashboard modules contain no credential material', () => {
  const source = ACCOUNT_MODULES.map(read).join('\n')

  const hexLiterals = source.match(/['"][0-9a-fA-F]{48,}['"]/g) ?? []
  for (const literal of hexLiterals) {
    assert.equal(
      literal.length,
      66,
      `account source must not embed a long hex literal: ${literal.slice(0, 12)}…`,
    )
  }

  assert.equal(source.includes('nostr+walletconnect://'), false)
  assert.equal(source.includes(PREIMAGE), false)
  assert.equal(source.includes(SECRET), false)
  assert.equal(source.includes(INVOICE_TEXT), false)
})

test('the account dashboard never renders a credential or a preimage', () => {
  const html = renderDashboard({
    info: {
      alias: 'Example wallet',
      network: 'mainnet',
      methods: ['get_info', 'get_balance', 'list_transactions'],
    },
    transactions: [
      {
        type: 'incoming',
        amountMsat: 1_000,
        amountSats: 1,
        paymentHashRef: `${PAYMENT_HASH.slice(0, 16)}…`,
      },
    ],
  })

  assert.equal(html.includes(SECRET), false)
  assert.equal(html.includes(PREIMAGE), false)
  assert.equal(html.includes(INVOICE_TEXT), false)
  assert.equal(html.includes(PAYMENT_HASH), false)
})
