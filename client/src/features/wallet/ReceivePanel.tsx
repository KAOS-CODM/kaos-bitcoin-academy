import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { PaymentRequester } from './PaymentPanel'
import {
  createReceiveState,
  transitionReceive,
  type ReceiveState,
} from './payment'
import type { Nip47EnvelopeMethod, Nip47RequestResult } from './nwc-envelope'

export interface ReceivePanelProps {
  /** Methods reported by the connected wallet. */
  methods: readonly string[]
  /** A connected session, or null when no wallet is connected. */
  requester: PaymentRequester | null
  /** Default practice amount in satoshis. */
  defaultAmountSats: number
  /** Maximum practice amount in satoshis. */
  maxAmountSats: number
  /** Requested invoice expiry in seconds. */
  expirySeconds: number
}

function readAmountSats(value: string): number | undefined {
  const trimmed = value.trim()
  if (!/^\d{1,9}$/.test(trimmed)) return undefined
  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return undefined
  return parsed
}

export function ReceivePanel({
  methods,
  requester,
  defaultAmountSats,
  maxAmountSats,
  expirySeconds,
}: ReceivePanelProps) {
  const [amountSats, setAmountSats] = useState(String(defaultAmountSats))
  const [state, setState] = useState<ReceiveState>(createReceiveState())
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const requestId = useRef(0)

  const connected = requester !== null
  const supportsMake = methods.includes('make_invoice')
  const supportsLookup = methods.includes('lookup_invoice')

  async function onCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!requester || busy) return

    const attempt = ++requestId.current
    const sats = readAmountSats(amountSats)

    if (sats === undefined || sats > maxAmountSats) {
      setState((current) =>
        transitionReceive(current, {
          type: 'create-failed',
          reason: `Choose a whole number of satoshis between 1 and ${maxAmountSats}.`,
        }),
      )
      return
    }

    setBusy(true)
    setState((current) => transitionReceive(current, { type: 'create' }))

    const result: Nip47RequestResult = await requester.requestEnvelope('make_invoice', {
      amount: sats * 1000,
      description: 'KAOS Bitcoin Academy practice invoice',
      expiry: expirySeconds,
    })
    if (attempt !== requestId.current) return

    setBusy(false)

    if (result.status === 'failed') {
      setState((current) =>
        transitionReceive(current, {
          type: 'create-failed',
          reason:
            'The wallet did not return a usable invoice. Nothing was charged and no invoice was created.',
        }),
      )
      return
    }

    const payload = result.result as { invoice?: unknown; payment_hash?: unknown }
    const invoiceText = typeof payload.invoice === 'string' ? payload.invoice : ''

    if (invoiceText === '') {
      setState((current) =>
        transitionReceive(current, {
          type: 'create-failed',
          reason:
            'The wallet did not return a payable invoice, so there is nothing to share. No payment was received.',
        }),
      )
      return
    }

    setState((current) =>
      transitionReceive(current, {
        type: 'created',
        invoice: {
          paymentHash: typeof payload.payment_hash === 'string' ? payload.payment_hash : '',
          amountMsat: sats * 1000,
          amountSats: sats,
          hasFractionalSat: false,
          timestamp: Math.floor(Date.now() / 1000),
          expirySeconds,
          expiresAt: Math.floor(Date.now() / 1000) + expirySeconds,
          expiresAtMs: Date.now() + expirySeconds * 1000,
          network: 'mainnet',
          prefix: 'lnbc',
          raw: invoiceText,
        },
      }),
    )

    // Status monitoring is separate from creation and needs its own method.
    if (!supportsLookup) return

    void pollStatus(requester, attempt, sats * 1000, invoiceText)
  }

  async function pollStatus(
    activeRequester: PaymentRequester,
    attempt: number,
    amountMsat: number,
    invoiceText: string,
  ): Promise<void> {
    const deadline = Date.now() + expirySeconds * 1000 + 60_000
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      if (attempt !== requestId.current) return

      const lookup = await activeRequester.requestEnvelope('lookup_invoice', {
        invoice: invoiceText,
      })
      if (attempt !== requestId.current) return

      if (lookup.status !== 'ok') {
        setState((current) =>
          transitionReceive(current, {
            type: 'status-unavailable',
            reason:
              'The wallet did not return a usable status for this invoice. This does not mean the invoice failed.',
          }),
        )
        continue
      }

      const transaction = lookup.result as { state?: unknown }
      if (transaction.state === 'settled') {
        setState((current) => transitionReceive(current, { type: 'settled' }))
        return
      }
      if (transaction.state === 'expired') {
        setState((current) => transitionReceive(current, { type: 'expired' }))
        return
      }
      if (transaction.state === 'failed') {
        setState((current) =>
          transitionReceive(current, {
            type: 'failed',
            reason: 'The wallet reports that this invoice failed.',
          }),
        )
        return
      }

      setState((current) => transitionReceive(current, { type: 'waiting' }))
    }
  }

  const invoice = state.invoice

  return (
    <section
      aria-labelledby="receive-heading"
      className="mt-6 rounded-lg border border-line bg-surface p-5"
    >
      <h2 id="receive-heading" className="text-lg font-semibold text-parchment">
        Create a practice receive invoice
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        This asks your wallet for a real invoice. The invoice can be paid by anyone who receives
        it, and the academy holds no funds. Creating an invoice is not receiving money.
      </p>

      {!connected ? (
        <p className="mt-4 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
          Connect a wallet above to use the receive practice.
        </p>
      ) : !supportsMake ? (
        <p className="mt-4 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
          This wallet does not report the <code>make_invoice</code> method, so the receive practice
          is unavailable here.
        </p>
      ) : null}

      {connected && supportsMake ? (
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <label htmlFor="receive-amount" className="block text-sm font-semibold text-parchment">
            Amount in satoshis
          </label>
          <input
            id="receive-amount"
            value={amountSats}
            onChange={(event) => setAmountSats(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            className="w-32 rounded-md border border-line bg-ink px-3 py-2 text-sm text-parchment focus:border-amber focus:outline-none"
          />
          <p className="text-xs leading-5 text-muted">
            The practice limit is {maxAmountSats} satoshis. The invoice expires after{' '}
            {Math.round(expirySeconds / 60)} minutes.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-amber/50 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Create invoice'}
          </button>
        </form>
      ) : null}

      {state.phase === 'invoice-ready' && invoice ? (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/5 p-4">
          <h3 className="text-sm font-semibold text-amber">Invoice created</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {state.message} Amount {invoice.amountSats} sats. Expires{' '}
            {new Date(invoice.expiresAtMs).toLocaleString()}.
          </p>
          <textarea
            aria-label="Lightning invoice"
            readOnly
            value={invoice.raw}
            rows={3}
            spellCheck={false}
            className="mt-3 w-full rounded-md border border-line bg-ink px-3 py-2 font-mono text-xs break-all text-parchment"
          />
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(invoice.raw)
              setCopied(true)
            }}
            className="mt-3 rounded-md border border-line bg-surface-2 px-4 py-2 text-sm font-semibold text-muted"
          >
            {copied ? 'Copied' : 'Copy invoice'}
          </button>
        </div>
      ) : null}

      {state.phase === 'waiting' ? (
        <p role="status" className="mt-4 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
          Waiting for a payer. The invoice is payable until it expires.
        </p>
      ) : null}

      {state.phase === 'settled' ? (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/5 p-4">
          <h3 className="text-sm font-semibold text-amber">The wallet reports the invoice settled</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{state.message}</p>
        </div>
      ) : null}

      {state.phase === 'status-unavailable' ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-line bg-ink p-4 text-sm text-muted"
        >
          <p className="font-semibold text-parchment">Status unavailable</p>
          <p className="mt-1 leading-6">{state.message}</p>
        </div>
      ) : null}

      {state.phase === 'expired' ? (
        <p role="alert" className="mt-4 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
          {state.message}
        </p>
      ) : null}

      {state.phase === 'failed' ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/50 bg-danger/10 p-4 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}
    </section>
  )
}

export type { Nip47EnvelopeMethod }
