import { describeWalletMethod } from './methods'

const METHOD_USED_BY_THE_ACADEMY = {
  name: 'get_info',
  description:
    "Requests basic wallet information, such as the wallet's reported alias and network.",
} as const

export function WalletMethods({ methods }: { methods: string[] }) {
  return (
    <div className="mt-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-parchment">Method used by the Academy</h3>
        <div className="mt-2 rounded-md border border-amber/40 bg-amber/5 p-4">
          <code className="text-sm font-semibold text-parchment">
            {METHOD_USED_BY_THE_ACADEMY.name}
          </code>
          <p className="mt-1 text-sm leading-6 text-muted">
            {METHOD_USED_BY_THE_ACADEMY.description}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-parchment">
          Methods reported by the connected wallet
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          These are reported capabilities, not verified functionality. The Academy has not called
          or tested them.
        </p>

        {methods.length > 0 ? (
          <ul className="mt-3 space-y-2" aria-label="Methods reported by the connected wallet">
            {methods.map((method) => {
              const description = describeWalletMethod(method)
              return (
                <li key={method} className="rounded-md border border-line bg-ink p-3">
                  <code className="break-all text-sm font-semibold text-parchment">{method}</code>
                  {description ? (
                    <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">The wallet did not report any methods.</p>
        )}
      </div>

      <aside className="rounded-md border border-amber/40 bg-amber/5 p-4 text-sm leading-6 text-muted">
        <h3 className="font-semibold text-amber">What the Academy does and does not do</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>These additional methods are capabilities reported by the connected wallet.</li>
          <li>The Academy has not called or tested those additional methods.</li>
          <li>
            This page currently uses only <code>get_info</code>.
          </li>
          <li>Displaying a method does not mean the Academy supports that operation.</li>
          <li>
            This page does not request payments, create invoices, request balances, or retrieve
            transaction history.
          </li>
        </ul>
      </aside>
    </div>
  )
}
