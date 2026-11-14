import { Link } from 'react-router-dom'
import { APPROVED_RELAYS } from './nwc'

export function WalletActivityCallout() {
  return (
    <section
      aria-labelledby="wallet-activity-heading"
      className="mt-8 rounded-lg border border-amber/40 bg-amber/5 p-5 sm:p-6"
    >
      <p className="text-xs uppercase tracking-widest text-amber">Optional practical activity</p>
      <h2
        id="wallet-activity-heading"
        className="mt-2 text-xl font-semibold text-parchment sm:text-2xl"
      >
        Try a Lightning wallet connection
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">
        This is a guided practice. You have just seen how a Lightning wallet authorizes
        payments and how an invoice requests one. Nostr Wallet Connect (NWC) is a way for an app to
        ask a compatible wallet for information without holding your keys. Trying it here connects
        the topic to a real wallet interface.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber">Why</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            See how a wallet reports its own information after you have studied channels, invoices
            and wallet authorization.
          </p>
        </div>
        <div className="rounded-md border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber">What</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            The Academy calls <code>get_info</code> when you connect. The account dashboard calls{' '}
            <code>get_balance</code> and <code>list_transactions</code> only when you press the
            matching button, and it never polls. If you start a payment or create an invoice in
            the practice section, it calls <code>pay_invoice</code>, <code>make_invoice</code>, or{' '}
            <code>lookup_invoice</code> for that action only.
          </p>
        </div>
        <div className="rounded-md border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber">After</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Disconnect and clear the activity page. Revoke the connection in your wallet if you no
            longer need it.
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-muted">
        The wallet&apos;s generated connection URI determines which relay is used. The Academy
        currently accepts only URIs using these relays:
      </p>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Approved NWC relays">
        {APPROVED_RELAYS.map((relay) => (
          <li
            key={relay}
            className="rounded-full border border-line bg-ink px-3 py-1 text-xs text-parchment"
          >
            <code>{relay}</code>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-7 text-muted">
        This activity is optional. It is not required for lesson completion and does not unlock
        lessons, quizzes, XP, achievements, the Playground, or the AI Tutor. Use a fresh connection
        URI from a compatible wallet, and never paste a seed phrase or private key. Support is
        limited to URIs using the two relays above; this is not a claim that every NWC-compatible
        wallet is supported.
      </p>

      <Link
        to="/wallet"
        className="mt-5 inline-block rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft"
      >
        Open the wallet practice →
      </Link>
    </section>
  )
}
