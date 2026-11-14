import { describeCapabilities, type AccountCapability } from './account'
import { describeWalletMethod } from './methods'

const METHODS_USED_BY_THE_ACADEMY = [
  {
    name: 'get_info',
    description:
      "Requests basic wallet information, such as the wallet's reported alias and network.",
  },
  {
    name: 'get_balance',
    description:
      'Requests the balance the wallet reports, only when the learner asks for it.',
  },
  {
    name: 'list_transactions',
    description:
      'Requests the transaction history the wallet reports, only when the learner asks for it.',
  },
] as const

const CAPABILITY_BADGES: Record<AccountCapability['state'], string> = {
  'reported-and-verified': 'border-amber/50 bg-amber/10 text-amber',
  'reported-but-unavailable': 'border-danger/50 bg-danger/10 text-danger',
  reported: 'border-line bg-surface-2 text-parchment',
  'not-reported': 'border-line bg-ink text-muted',
}

export interface WalletMethodsProps {
  /** The methods the wallet reported in its most recent `get_info`. */
  methods: readonly string[]
  /** The methods that actually completed successfully in this session. */
  verified?: readonly string[]
  /** A short explanation per method whose request failed. */
  failures?: Readonly<Record<string, string>>
}

/**
 * The wallet's capability list.
 *
 * Three things are kept apart and never merged: the capabilities the wallet reports, the
 * operations the academy has actually tested successfully, and the operations that are
 * unavailable to the current connection. A method that appears in the wallet's list is a
 * claim by the wallet, not a verified capability.
 */
export function WalletMethods({
  methods,
  verified = [],
  failures = {},
}: WalletMethodsProps) {
  const capabilities = describeCapabilities({
    reported: methods,
    verified,
    failures,
  })

  const reported = capabilities.filter((capability) => capability.state !== 'not-reported')
  const unavailable = capabilities.filter(
    (capability) =>
      capability.state === 'not-reported' || capability.state === 'reported-but-unavailable',
  )

  return (
    <div className="mt-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-parchment">Method used by the Academy</h3>
        <div className="mt-2 space-y-2">
          {METHODS_USED_BY_THE_ACADEMY.map((method) => (
            <div key={method.name} className="rounded-md border border-amber/40 bg-amber/5 p-4">
              <code className="text-sm font-semibold text-parchment">{method.name}</code>
              <p className="mt-1 text-sm leading-6 text-muted">{method.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-parchment">
          Methods reported by the connected wallet
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          These are reported capabilities, not verified functionality. The Academy has not called
          or tested every method here; the badge shows whether this one has actually been tested
          in this session.
        </p>

        {reported.length > 0 ? (
          <ul className="mt-3 space-y-2" aria-label="Methods reported by the connected wallet">
            {reported.map((capability) => {
              const description = describeWalletMethod(capability.method)
              return (
                <li key={capability.method} className="rounded-md border border-line bg-ink p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="break-all text-sm font-semibold text-parchment">
                      {capability.method}
                    </code>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CAPABILITY_BADGES[capability.state]}`}
                    >
                      {capability.label}
                    </span>
                  </div>
                  {description ? (
                    <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
                  ) : null}
                  <p className="mt-1 text-xs leading-5 text-muted">{capability.detail}</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">The wallet did not report any methods.</p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-parchment">
          Operations unavailable to this connection
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          These operations are not available right now. A method the wallet did not report was
          never available here; a method that was reported but failed is unavailable until the
          connection changes.
        </p>

        {unavailable.length > 0 ? (
          <ul className="mt-3 space-y-2" aria-label="Operations unavailable to this connection">
            {unavailable.map((capability) => (
              <li key={capability.method} className="rounded-md border border-line bg-ink p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="break-all text-sm font-semibold text-parchment">
                    {capability.method}
                  </code>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CAPABILITY_BADGES[capability.state]}`}
                  >
                    {capability.label}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">{capability.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Every operation the academy knows about is available on this connection.
          </p>
        )}
      </div>

      <aside className="rounded-md border border-amber/40 bg-amber/5 p-4 text-sm leading-6 text-muted">
        <h3 className="font-semibold text-amber">What the Academy does and does not do</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>These additional methods are capabilities reported by the connected wallet.</li>
          <li>The Academy has not verified that the wallet actually supports them.</li>
          <li>
            This page calls <code>get_info</code> when you connect. It calls <code>pay_invoice</code>,{' '}
            <code>make_invoice</code>, and <code>lookup_invoice</code> only when you ask for a
            payment or an invoice in the practice section below.
          </li>
          <li>
            The account dashboard requests a balance or a transaction history only when you press
            the matching button. It never polls and never runs on its own.
          </li>
          <li>Displaying a method does not mean the Academy supports that operation.</li>
        </ul>
      </aside>
    </div>
  )
}
