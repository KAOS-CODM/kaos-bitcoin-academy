import { useEffect, useRef, useState } from 'react'
import {
  ACCOUNT_TRANSACTION_LIMIT,
  deriveAccountDiagnostic,
  formatBtc,
  formatSats,
  requestAccountBalance,
  requestAccountInfo,
  requestAccountTransactions,
  type AccountConnectionState,
  type AccountFailure,
  type AccountRequester,
  type WalletAccountSnapshot,
  type WalletBalance,
  type WalletTransaction,
} from './account'
import { WalletMethods } from './WalletMethods'
import type { SanitizedGetInfoResponse } from './nwc'

export interface WalletAccountDashboardProps {
  /** Everything the dashboard renders. */
  snapshot: WalletAccountSnapshot
  /** Runs one `get_info` request. */
  onRefreshInfo: () => void
  /** Runs one `get_balance` request. */
  onCheckBalance: () => void
  /** Runs one `list_transactions` request. */
  onLoadTransactions: () => void
}

const CONNECTION_LABELS: Record<AccountConnectionState, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Connection error',
}

const EXTRA_INFO_ROWS: Array<[keyof SanitizedGetInfoResponse, string]> = [
  ['pubkey', 'Wallet public key'],
  ['color', 'Color'],
  ['block_height', 'Block height'],
  ['block_hash', 'Block hash'],
]

function formatTimestamp(value: number | null): string {
  if (value === null) return 'Not yet'
  return new Date(value).toLocaleString()
}

function formatTransactionTime(seconds: number | undefined): string {
  if (seconds === undefined) return 'Not reported'
  return new Date(seconds * 1000).toLocaleString()
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  return (
    <tr className="border-t border-line/70 align-top">
      <td className="py-3 pr-3 text-sm text-parchment">
        {transaction.type === 'incoming' ? 'Incoming' : 'Outgoing'}
      </td>
      <td className="py-3 pr-3 text-sm text-parchment">
        {formatSats(transaction.amountSats)} sats
      </td>
      <td className="py-3 pr-3 text-sm text-muted">
        {transaction.state ? transaction.state : 'Not reported'}
      </td>
      <td className="py-3 pr-3 text-sm text-muted">
        {formatTransactionTime(transaction.createdAt)}
      </td>
      <td className="py-3 text-xs text-muted">
        <span className="break-all font-mono">
          {transaction.paymentHashRef ? transaction.paymentHashRef : 'Not reported'}
        </span>
        {transaction.description ? (
          <span className="mt-1 block text-xs leading-5 text-muted">
            {transaction.description}
          </span>
        ) : null}
      </td>
    </tr>
  )
}

function FailureNotice({
  failure,
  onRetry,
  retryLabel,
}: {
  failure: AccountFailure
  onRetry: () => void
  retryLabel: string
}) {
  return (
    <div role="alert" className="mt-4 rounded-lg border border-danger/50 bg-danger/10 p-4">
      <p className="text-sm font-semibold text-danger">{failure.title}</p>
      <p className="mt-1 text-sm leading-6 text-parchment">{failure.message}</p>
      {failure.retryable ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-danger/50 px-4 py-2 text-sm font-semibold text-danger"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

/**
 * The presentational wallet account dashboard.
 *
 * It renders only what the snapshot contains. It never runs a request itself: every button
 * calls a handler supplied by the container, so a request can only start from an explicit
 * user action.
 */
export function WalletAccountDashboard({
  snapshot,
  onRefreshInfo,
  onCheckBalance,
  onLoadTransactions,
}: WalletAccountDashboardProps) {
  const {
    connection,
    reportedMethods,
    verifiedMethods,
    methodFailures,
    info,
    infoRefreshedAt,
    infoFailure,
    balance,
    balanceCheckedAt,
    balanceFailure,
    transactions,
    historyRequestedAt,
    historyFailure,
    busy,
  } = snapshot

  const connected = connection === 'connected'
  const supportsBalance = reportedMethods.includes('get_balance')
  const supportsHistory = reportedMethods.includes('list_transactions')

  const diagnostic = deriveAccountDiagnostic({
    connection,
    infoAvailable: info !== null,
    balanceAvailable: balance !== null,
    failures: [infoFailure, balanceFailure, historyFailure],
  })

  const extraRows = EXTRA_INFO_ROWS.flatMap(([key, label]) => {
    const value = info?.[key]
    if (value === undefined) return []
    return [{ key, label, value: String(value) }]
  })

  return (
    <section
      aria-labelledby="account-dashboard-heading"
      className="mt-6 rounded-lg border border-line bg-surface p-5"
    >
      <h2 id="account-dashboard-heading" className="text-lg font-semibold text-parchment">
        Wallet account dashboard
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Inspect the connected wallet. Every value here is the wallet&apos;s own report, and every
        request runs only when you press its button. There is no automatic refresh and no
        background polling.
      </p>

      <section aria-labelledby="account-connection-heading" className="mt-5">
        <h3 id="account-connection-heading" className="text-sm font-semibold text-parchment">
          Connection overview
        </h3>

        <dl className="mt-3 divide-y divide-line/70">
          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
            <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
              Connection state
            </dt>
            <dd className="break-words text-sm text-parchment">
              {CONNECTION_LABELS[connection]}
            </dd>
          </div>
          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
            <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
              Wallet alias
            </dt>
            <dd className="break-words text-sm text-parchment">
              {info?.alias ?? 'Not reported by the wallet'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
            <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
              Network
            </dt>
            <dd className="break-words text-sm text-parchment">
              {info?.network ?? 'Not reported by the wallet'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
            <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
              Last information refresh
            </dt>
            <dd className="break-words text-sm text-parchment">
              {formatTimestamp(infoRefreshedAt)}
            </dd>
          </div>
          {extraRows.map((row) => (
            <div key={row.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
              <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
                {row.label}
              </dt>
              <dd className="break-words text-sm text-parchment">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefreshInfo}
            disabled={!connected || busy.info}
            className="rounded-md border border-amber/50 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber disabled:opacity-50"
          >
            {busy.info ? 'Requesting wallet information…' : 'Refresh wallet information'}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          This asks the wallet for <code>get_info</code>. A connected wallet is not a funded
          wallet: the academy never labels a wallet funded or payment-ready from a connection
          alone.
        </p>

        {infoFailure ? (
          <FailureNotice
            failure={infoFailure}
            onRetry={onRefreshInfo}
            retryLabel="Try the wallet information request again"
          />
        ) : null}
      </section>

      <section aria-labelledby="account-balance-heading" className="mt-6">
        <h3 id="account-balance-heading" className="text-sm font-semibold text-parchment">
          Balance
        </h3>

        {!connected ? (
          <p className="mt-3 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
            Connect a wallet above to read a balance.
          </p>
        ) : !supportsBalance ? (
          <p className="mt-3 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
            This wallet does not report the <code>get_balance</code> method, so a balance cannot
            be requested on this connection.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={onCheckBalance}
              disabled={busy.balance}
              className="mt-3 rounded-md border border-amber/50 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber disabled:opacity-50"
            >
              {busy.balance ? 'Requesting the balance…' : 'Check balance'}
            </button>
            <p className="mt-2 text-xs leading-5 text-muted">
              This asks the wallet for <code>get_balance</code>. The academy never estimates a
              balance and never shows a cached one as current.
            </p>
          </>
        )}

        {busy.balance ? (
          <p role="status" className="mt-3 text-sm text-muted">
            Waiting for the wallet to answer the balance request.
          </p>
        ) : null}

        {balanceFailure ? (
          <FailureNotice
            failure={balanceFailure}
            onRetry={onCheckBalance}
            retryLabel="Try the balance request again"
          />
        ) : null}

        {balance ? (
          <div className="mt-4 rounded-lg border border-line bg-ink p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Last successful balance check
            </p>
            <p className="mt-1 text-2xl font-semibold text-parchment">
              {formatSats(balance.balanceSats)} sats
            </p>
            <p className="mt-1 text-sm text-muted">{formatBtc(balance.balanceSats)} BTC</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Reported by the wallet at {formatTimestamp(balanceCheckedAt)}. This is the
              wallet&apos;s report at that time, not a guarantee of the balance now.
              {balanceFailure
                ? ' The most recent balance request did not succeed, so this is the last check that did.'
                : ''}
            </p>
          </div>
        ) : null}

        {!balance && !balanceFailure && !busy.balance && connected && supportsBalance ? (
          <p className="mt-3 text-sm text-muted">
            No balance has been requested in this session yet.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="account-history-heading" className="mt-6">
        <h3 id="account-history-heading" className="text-sm font-semibold text-parchment">
          Transaction history
        </h3>

        {!connected ? (
          <p className="mt-3 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
            Connect a wallet above to read transaction history.
          </p>
        ) : !supportsHistory ? (
          <p className="mt-3 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
            This wallet does not report the <code>list_transactions</code> method, so transaction
            history is unavailable on this connection.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={onLoadTransactions}
              disabled={busy.history}
              className="mt-3 rounded-md border border-amber/50 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber disabled:opacity-50"
            >
              {busy.history
                ? 'Requesting transaction history…'
                : 'Load transaction history'}
            </button>
            <p className="mt-2 text-xs leading-5 text-muted">
              This asks the wallet for <code>list_transactions</code> with a limit of{' '}
              {ACCOUNT_TRANSACTION_LIMIT} records. The academy never invents a transaction
              record.
            </p>
          </>
        )}

        {busy.history ? (
          <p role="status" className="mt-3 text-sm text-muted">
            Waiting for the wallet to answer the transaction history request.
          </p>
        ) : null}

        {historyFailure ? (
          <FailureNotice
            failure={historyFailure}
            onRetry={onLoadTransactions}
            retryLabel="Try the transaction history request again"
          />
        ) : null}

        {transactions && transactions.length === 0 && !historyFailure ? (
          <p className="mt-3 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
            The wallet returned no transactions for this request. That is an empty history, not
            a failure.
          </p>
        ) : null}

        {transactions && transactions.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <caption className="sr-only">
                Transaction history reported by the wallet, last requested at{' '}
                {formatTimestamp(historyRequestedAt)}
              </caption>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Amount
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Time
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <TransactionRow
                    key={`${transaction.type}-${transaction.createdAt ?? index}-${index}`}
                    transaction={transaction}
                  />
                ))}
              </tbody>
            </table>
            <p className="border-t border-line px-3 py-2 text-xs leading-5 text-muted">
              Last successful history request: {formatTimestamp(historyRequestedAt)}. Only a
              shortened payment hash reference is shown. Preimages and full invoices are never
              displayed.
              {historyFailure
                ? ' The most recent history request did not succeed, so this is the last request that did.'
                : ''}
            </p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="account-capabilities-heading" className="mt-6">
        <h3 id="account-capabilities-heading" className="text-sm font-semibold text-parchment">
          Wallet capabilities
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          Three different things are kept apart: what the wallet reports, what the academy has
          actually tested successfully, and what is unavailable to this connection. A method in
          the wallet&apos;s list is not assumed to work.
        </p>

        <WalletMethods
          methods={reportedMethods}
          verified={verifiedMethods}
          failures={methodFailures}
        />
      </section>

      <section aria-labelledby="account-diagnostics-heading" className="mt-6">
        <h3 id="account-diagnostics-heading" className="text-sm font-semibold text-parchment">
          Account diagnostics
        </h3>
        <div
          role="status"
          aria-live="polite"
          className="mt-3 rounded-lg border border-line bg-ink p-4"
        >
          <p className="text-sm font-semibold text-parchment">{diagnostic.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{diagnostic.message}</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          These diagnostics describe the wallet connection and the account requests only. They
          are not payment results, and they never say that a wallet holds funds.
        </p>
      </section>
    </section>
  )
}

export interface WalletDashboardProps {
  /** The methods the wallet reported when the connection was opened. */
  methods: readonly string[]
  /** The connect-time `get_info` result, when a wallet is connected. */
  info: SanitizedGetInfoResponse | null
  /** When the connect-time `get_info` request succeeded. */
  infoRefreshedAt: number | null
  /** The connection state shown in the page's connection status section. */
  connection: AccountConnectionState
  /** A connected session, or null when no wallet is connected. */
  requester: AccountRequester | null
  /** Called with the result of a successful manual `get_info` request. */
  onInfoRefreshed: (info: SanitizedGetInfoResponse, at: number) => void
}

/**
 * The stateful wallet account dashboard.
 *
 * The container owns the manual request handlers. Nothing here runs on mount: the only
 * effect invalidates a pending response when the page goes away, so a late reply can never
 * restore stale account data.
 */
export function WalletDashboard({
  methods,
  info,
  infoRefreshedAt,
  connection,
  requester,
  onInfoRefreshed,
}: WalletDashboardProps) {
  const [refresh, setRefresh] = useState<{
    info: SanitizedGetInfoResponse
    at: number
  } | null>(null)
  const [infoFailure, setInfoFailure] = useState<AccountFailure | null>(null)
  const [balance, setBalance] = useState<{
    value: WalletBalance
    at: number
  } | null>(null)
  const [balanceFailure, setBalanceFailure] = useState<AccountFailure | null>(null)
  const [transactions, setTransactions] = useState<{
    value: readonly WalletTransaction[]
    at: number
  } | null>(null)
  const [historyFailure, setHistoryFailure] = useState<AccountFailure | null>(null)
  const [verified, setVerified] = useState<readonly string[]>(
    info ? ['get_info'] : [],
  )
  const [methodFailures, setMethodFailures] = useState<Readonly<Record<string, string>>>(
    {},
  )
  const [busy, setBusy] = useState({ info: false, balance: false, history: false })
  const requestId = useRef(0)

  useEffect(() => {
    // A response that arrives after the page has gone is discarded.
    return () => {
      requestId.current += 1
    }
  }, [])

  const effectiveInfo = refresh?.info ?? info
  const effectiveInfoRefreshedAt = refresh?.at ?? infoRefreshedAt
  const reportedMethods = effectiveInfo?.methods ?? methods

  function markVerified(method: string): void {
    setVerified((current) =>
      current.includes(method) ? current : [...current, method],
    )
    setMethodFailures((current) => {
      if (!(method in current)) return current
      const next = { ...current }
      delete next[method]
      return next
    })
  }

  function markFailed(method: string, failure: AccountFailure): void {
    setMethodFailures((current) => ({ ...current, [method]: failure.title }))
  }

  async function onRefreshInfo(): Promise<void> {
    if (!requester || busy.info) return

    const attempt = ++requestId.current
    setBusy((current) => ({ ...current, info: true }))

    const outcome = await requestAccountInfo(requester)
    if (attempt !== requestId.current) return

    setBusy((current) => ({ ...current, info: false }))

    if (outcome.status === 'ok') {
      setRefresh({ info: outcome.value, at: outcome.receivedAt })
      setInfoFailure(null)
      markVerified('get_info')
      onInfoRefreshed(outcome.value, outcome.receivedAt)
      return
    }

    setInfoFailure(outcome.failure)
    markFailed('get_info', outcome.failure)
  }

  async function onCheckBalance(): Promise<void> {
    if (!requester || busy.balance) return

    const attempt = ++requestId.current
    setBusy((current) => ({ ...current, balance: true }))

    const outcome = await requestAccountBalance(requester)
    if (attempt !== requestId.current) return

    setBusy((current) => ({ ...current, balance: false }))

    if (outcome.status === 'ok') {
      setBalance({ value: outcome.value, at: outcome.receivedAt })
      setBalanceFailure(null)
      markVerified('get_balance')
      return
    }

    // A failed balance request is never shown as a zero balance. The previous value stays
    // visible only as the last successful check, and the failure is shown next to it.
    setBalanceFailure(outcome.failure)
    markFailed('get_balance', outcome.failure)
  }

  async function onLoadTransactions(): Promise<void> {
    if (!requester || busy.history) return

    const attempt = ++requestId.current
    setBusy((current) => ({ ...current, history: true }))

    const outcome = await requestAccountTransactions(requester)
    if (attempt !== requestId.current) return

    setBusy((current) => ({ ...current, history: false }))

    if (outcome.status === 'ok') {
      setTransactions({ value: outcome.value, at: outcome.receivedAt })
      setHistoryFailure(null)
      markVerified('list_transactions')
      return
    }

    setHistoryFailure(outcome.failure)
    markFailed('list_transactions', outcome.failure)
  }

  const snapshot: WalletAccountSnapshot = {
    connection,
    reportedMethods,
    verifiedMethods: verified,
    methodFailures,
    info: effectiveInfo,
    infoRefreshedAt: effectiveInfoRefreshedAt,
    infoFailure,
    balance: balance?.value ?? null,
    balanceCheckedAt: balance?.at ?? null,
    balanceFailure,
    transactions: transactions?.value ?? null,
    historyRequestedAt: transactions?.at ?? null,
    historyFailure,
    busy,
  }

  return (
    <WalletAccountDashboard
      snapshot={snapshot}
      onRefreshInfo={() => {
        void onRefreshInfo()
      }}
      onCheckBalance={() => {
        void onCheckBalance()
      }}
      onLoadTransactions={() => {
        void onLoadTransactions()
      }}
    />
  )
}
