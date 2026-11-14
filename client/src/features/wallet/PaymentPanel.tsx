import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { inspectInvoice, verifyPreimage, type DecodedInvoice } from './invoice'
import {
  PaymentAttemptGuard,
  PaymentStatusLookup,
  createSendState,
  describeEvidence,
  describeNip47Failure,
  describePaymentStatus,
  transitionSend,
  type PaymentStatusOutcome,
  type PaymentStatusRequester,
  type SendState,
} from './payment'

/**
 * The narrow surface the payment panel needs from a wallet session. A real session and a
 * test double both satisfy it, so the panel never touches the wallet client directly.
 */
export type PaymentRequester = PaymentStatusRequester

export interface PaymentPanelProps {
  /** Methods reported by the connected wallet. */
  methods: readonly string[]
  /** A connected session, or null when no wallet is connected. */
  requester: PaymentRequester | null
  /** Maximum payable amount in millisatoshis. */
  maxAmountMsat: number
}

export interface PaymentStatusControlProps {
  /** The invoice under investigation, when one is still retained. */
  invoice: DecodedInvoice | undefined
  /** The outcome of the single lookup, once it has completed. */
  outcome: PaymentStatusOutcome | null
  /** True while the single lookup request is in progress. */
  busy: boolean
  /** True only while the payment outcome is unverified and the control may be activated. */
  available: boolean
  /** Activates the one-shot lookup. */
  onCheck: () => void
}

/**
 * The one-shot payment status control.
 *
 * The control is only offered while a payment outcome is unverified, and it never runs by
 * itself: the request is issued solely from an explicit click.
 */
export function PaymentStatusControl({
  invoice,
  outcome,
  busy,
  available,
  onCheck,
}: PaymentStatusControlProps) {
  if (!available && outcome === null) return null

  return (
    <div className="mt-4 rounded-lg border border-line bg-ink p-4">
      <h3 className="text-sm font-semibold text-parchment">Check payment status</h3>
      {outcome === null ? (
        <>
          <p className="mt-1 text-sm leading-6 text-muted">
            Check whether your wallet reports this invoice as settled. This does not make another
            payment.
          </p>
          <button
            type="button"
            onClick={onCheck}
            disabled={busy}
            className="mt-3 rounded-md border border-amber/50 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber disabled:opacity-50"
          >
            {busy ? 'Checking payment status…' : 'Check payment status'}
          </button>
        </>
      ) : (
        <p role="status" className="mt-2 text-sm leading-6 text-muted">
          {outcome.message}
        </p>
      )}
    </div>
  )
}

function formatAmount(invoice: DecodedInvoice): string {
  if (invoice.hasFractionalSat) {
    return `${invoice.amountSats.toFixed(3)} sats (${invoice.amountMsat} msat)`
  }
  return `${invoice.amountSats} sats`
}

export function PaymentPanel({ methods, requester, maxAmountMsat }: PaymentPanelProps) {
  const [input, setInput] = useState('')
  const [state, setState] = useState<SendState>(createSendState())
  const [busy, setBusy] = useState(false)
  const [statusOutcome, setStatusOutcome] = useState<PaymentStatusOutcome | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const guard = useRef(new PaymentAttemptGuard())
  const statusLookup = useRef(new PaymentStatusLookup())
  const requestId = useRef(0)

  const connected = requester !== null
  const supportsPay = methods.includes('pay_invoice')
  const supportsLookup = methods.includes('lookup_invoice')

  function reset(): void {
    requestId.current += 1
    setState(createSendState())
    setInput('')
    setBusy(false)
    // A new attempt is a new intent, so the one-shot lookup guard starts fresh.
    statusLookup.current = new PaymentStatusLookup()
    setStatusOutcome(null)
    setStatusBusy(false)
  }

  function onInspect(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (busy) return

    const attempt = ++requestId.current
    setState((current) => transitionSend(current, { type: 'inspect' }))

    const inspection = inspectInvoice(input, { maxAmountMsat })
    if (attempt !== requestId.current) return

    if (inspection.status === 'invalid') {
      setState((current) =>
        transitionSend(current, { type: 'inspected-invalid', reason: inspection.reason }),
      )
      return
    }

    if (guard.current.has(inspection.invoice.paymentHash)) {
      setState((current) =>
        transitionSend(current, {
          type: 'inspected-invalid',
          reason:
            'This invoice was already attempted in this page session. Check your wallet activity before paying anything else.',
        }),
      )
      return
    }

    setState((current) => transitionSend(current, { type: 'inspected', invoice: inspection.invoice }))
  }

  function onConfirm(): void {
    setState((current) => transitionSend(current, { type: 'confirm' }))
  }

  /**
   * Ask the wallet once whether the attempted payment settled.
   *
   * The request is issued only from this explicit click, carries only the payment hash, and is
   * never repeated. A lookup result can never start a payment.
   */
  async function onCheckStatus(): Promise<void> {
    if (!requester || statusBusy) return
    const invoice = state.invoice
    if (!invoice) return

    const attempt = ++requestId.current
    setStatusBusy(true)

    const outcome = await statusLookup.current.run(requester, {
      paymentHash: invoice.paymentHash,
      amountMsat: invoice.amountMsat,
    })
    if (attempt !== requestId.current) return

    setStatusBusy(false)
    setStatusOutcome(outcome)

    // A wallet-reported settlement uses the existing frozen evidence transition. It is never
    // receiver confirmation.
    if (outcome.settledReported) {
      setState((current) => transitionSend(current, { type: 'wallet-settled' }))
    }
  }

  async function onPay(): Promise<void> {
    if (!requester || busy) return
    const invoice = state.invoice
    if (!invoice) return

    const attempt = ++requestId.current
    setBusy(true)
    setState((current) => transitionSend(current, { type: 'submit' }))

    // Claim the hash before the request is published so the same invoice is never
    // submitted twice in one session.
    if (!guard.current.claim(invoice.paymentHash)) {
      setBusy(false)
      setState((current) =>
        transitionSend(current, {
          type: 'unknown',
          reason:
            'This invoice was already attempted in this page session. Do not pay it again. Check your wallet activity.',
        }),
      )
      return
    }

    const result = await requester.requestEnvelope('pay_invoice', { invoice: invoice.raw })
    if (attempt !== requestId.current) return

    setBusy(false)

    if (result.status === 'failed') {
      const failure = describeNip47Failure(result.kind, result.code)
      setState((current) =>
        transitionSend(current, { type: 'unknown', reason: failure.message }),
      )
      return
    }

    const payload = result.result as { preimage?: unknown }
    const preimage = typeof payload.preimage === 'string' ? payload.preimage : ''

    if (!/^[0-9a-f]{64}$/i.test(preimage)) {
      setState((current) =>
        transitionSend(current, {
          type: 'unknown',
          reason:
            'The wallet replied without a usable preimage, so the payment is unverified. Do not pay the same invoice again. Check your wallet activity.',
        }),
      )
      return
    }

    setState((current) => transitionSend(current, { type: 'response-returned' }))

    // A preimage that hashes to the invoice payment hash is payer-side evidence.
    if (!verifyPreimage(preimage, invoice.paymentHash)) {
      setState((current) =>
        transitionSend(current, {
          type: 'unknown',
          reason:
            'The preimage did not match the invoice payment hash, so the payment is unverified. Do not pay the same invoice again. Check your wallet activity.',
        }),
      )
      return
    }

    setState((current) => transitionSend(current, { type: 'preimage-verified' }))

    // Wallet-reported settlement is a separate, stronger level of evidence.
    if (!supportsLookup) {
      return
    }

    const lookup = await requester.requestEnvelope('lookup_invoice', {
      payment_hash: invoice.paymentHash,
      invoice: invoice.raw,
    })
    if (attempt !== requestId.current) return

    if (lookup.status === 'ok') {
      // The same hash/amount match rule applies here as in the status control: the frozen
      // plan allows wallet-settled evidence only when both still match.
      const outcome = describePaymentStatus(lookup, {
        paymentHash: invoice.paymentHash,
        amountMsat: invoice.amountMsat,
      })
      if (outcome.settledReported) {
        setState((current) => transitionSend(current, { type: 'wallet-settled' }))
      }
    }
  }

  const invoice = state.invoice
  const sats = invoice ? Math.ceil(invoice.amountMsat / 1000) : 0

  return (
    <section aria-labelledby="send-heading" className="mt-6 rounded-lg border border-line bg-surface p-5">
      <h2 id="send-heading" className="text-lg font-semibold text-parchment">
        Pay a Lightning invoice
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Paste an invoice, check the amount and expiry yourself, then approve one payment. The
        academy never pays automatically and never retries a payment on your behalf.
      </p>

      {!connected ? (
        <p className="mt-4 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
          Connect a wallet above to use the payment practice.
        </p>
      ) : !supportsPay ? (
        <p className="mt-4 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
          This wallet does not report the <code>pay_invoice</code> method, so the payment practice is
          unavailable here.
        </p>
      ) : null}

      {connected && supportsPay ? (
        <form onSubmit={onInspect} className="mt-4 space-y-3">
          <label htmlFor="send-invoice" className="block text-sm font-semibold text-parchment">
            Invoice
          </label>
          <textarea
            id="send-invoice"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            spellCheck={false}
            autoComplete="off"
            placeholder="lnbc…"
            className="w-full rounded-md border border-line bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-amber focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md border border-amber/50 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber disabled:opacity-50"
            >
              Check invoice
            </button>
            {state.phase !== 'idle' && state.phase !== 'blocked' ? (
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-line bg-surface-2 px-4 py-2 text-sm font-semibold text-muted"
              >
                Start over
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {state.phase === 'blocked' ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/50 bg-danger/10 p-4 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      {invoice && state.phase === 'ready' ? (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/5 p-4">
          <h3 className="text-sm font-semibold text-amber">Check this invoice before approving</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Amount</dt>
              <dd className="font-semibold text-parchment">{formatAmount(invoice)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Payment hash</dt>
              <dd className="break-all font-mono text-xs text-parchment">
                {invoice.paymentHash.slice(0, 16)}…
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Expires</dt>
              <dd className="text-parchment">{new Date(invoice.expiresAtMs).toLocaleString()}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Network</dt>
              <dd className="text-parchment">{invoice.network}</dd>
            </div>
            {invoice.description ? (
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">Description</dt>
                <dd className="max-w-xs text-right text-parchment">{invoice.description}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted">
            The description is supplied by whoever created the invoice and is not verified. The
            local check confirms the invoice structure and checksum only; it does not verify the
            invoice signature.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-md border border-amber/50 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber"
            >
              Pay {sats} sats
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-line bg-surface-2 px-4 py-2 text-sm font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {state.phase === 'confirming' ? (
        <div className="mt-4 rounded-lg border border-amber/50 bg-amber/10 p-4">
          <h3 className="text-sm font-semibold text-amber">
            You are about to send {sats} sats from your wallet
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Your wallet decides whether to approve this payment.</li>
            <li>The academy cannot reverse a payment once it is sent.</li>
            <li>The academy never retries a payment for you.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void onPay()
              }}
              disabled={busy}
              className="rounded-md border border-amber bg-amber px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
            >
              Confirm and pay {sats} sats
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-line bg-surface-2 px-4 py-2 text-sm font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {state.phase === 'submitting' ? (
        <p role="status" className="mt-4 rounded-lg border border-line bg-ink p-4 text-sm text-muted">
          Waiting for your wallet to respond. Do not submit again.
        </p>
      ) : null}

      {state.phase === 'request-returned' ? (
        <div className="mt-4 rounded-lg border border-line bg-ink p-4">
          <h3 className="text-sm font-semibold text-parchment">The wallet returned a response</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{describeEvidence(state.evidence)}</p>
        </div>
      ) : null}

      {state.phase === 'preimage-verified' ? (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/5 p-4">
          <h3 className="text-sm font-semibold text-amber">Payment evidence verified</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{describeEvidence(state.evidence)}</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            This is payer-side evidence. It is not independent confirmation from the receiving
            side, and this page does not store a receipt.
          </p>
        </div>
      ) : null}

      {state.phase === 'wallet-settled' ? (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/5 p-4">
          <h3 className="text-sm font-semibold text-amber">Wallet reports the payment settled</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{describeEvidence(state.evidence)}</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            A wallet-reported settlement is stronger than a preimage alone, but it is still not
            independent confirmation from the receiving side.
          </p>
        </div>
      ) : null}

      {state.phase === 'unknown' ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/50 bg-danger/10 p-4 text-sm text-danger"
        >
          <p className="font-semibold">This payment is unverified</p>
          <p className="mt-1 leading-6">{state.message}</p>
        </div>
      ) : null}

      <PaymentStatusControl
        invoice={state.invoice}
        outcome={statusOutcome}
        busy={statusBusy}
        available={state.phase === 'unknown' && state.invoice !== undefined}
        onCheck={() => {
          void onCheckStatus()
        }}
      />

      {state.phase === 'failed' ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/50 bg-danger/10 p-4 text-sm text-danger"
        >
          <p className="font-semibold">The wallet reported a failure</p>
          <p className="mt-1 leading-6">{state.message}</p>
        </div>
      ) : null}

      {state.phase === 'rejected' ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/50 bg-danger/10 p-4 text-sm text-danger"
        >
          <p className="font-semibold">The wallet refused the request</p>
          <p className="mt-1 leading-6">{state.message}</p>
        </div>
      ) : null}
    </section>
  )
}
