import { useState } from 'react'
import { FictionalDataBadge } from '../FictionalDataBadge'
import { SimulationLayout } from '../SimulationLayout'
import { SimulationSection } from '../SimulationSection'
import { DEMO_WALLET, SIMULATION_BY_ID } from '../data'

export function WalletCreationSimulation() {
  const [shown, setShown] = useState(false)

  return (
    <SimulationLayout meta={SIMULATION_BY_ID['wallet-creation']}>
      <SimulationSection id="wallet-demo-heading" title="Fictional wallet demonstration">
        <div className="mt-2">
          <FictionalDataBadge />
        </div>
        <p className="mt-3 leading-7 text-muted">
          A Bitcoin wallet is a tool that manages keys. It does not hold bitcoin inside itself the
          way a physical wallet holds cash. The wallet uses a private key to authorise spending and
          gives out an address so others can send bitcoin to it.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShown(true)}
            disabled={shown}
            className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {shown ? 'Demonstration shown' : 'Show fictional wallet example'}
          </button>
          <button
            type="button"
            onClick={() => setShown(false)}
            disabled={!shown}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment transition hover:border-amber disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset demonstration
          </button>
        </div>

        {shown ? (
          <div className="mt-6">
            <p className="text-sm leading-6 text-muted">
              Read the relationship from left to right. The arrows describe the idea, not real
              cryptography. These labels are fictional and cannot be used as a wallet.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
              <DemoCard
                label="Private key"
                value={DEMO_WALLET.privateKey}
                note="Secret. In a real wallet, it controls spending."
                secret
              />
              <RelationArrow label="one-way derivation" />
              <DemoCard
                label="Public key"
                value={DEMO_WALLET.publicKey}
                note="Shareable. It can help others verify a signature."
              />
              <RelationArrow label="address is derived" />
              <DemoCard
                label="Address"
                value={DEMO_WALLET.address}
                note="Shareable. An address is used to receive bitcoin."
              />
            </div>
            <p className="mt-4 rounded-md border border-amber/40 bg-amber/5 p-3 text-sm leading-6 text-muted">
              No seed phrase is shown here on purpose. A real recovery phrase is a secret that can
              restore a wallet, and this demonstration must never look like one.
            </p>
          </div>
        ) : (
          <p className="mt-6 rounded-md border border-line/70 bg-ink/40 p-4 text-sm leading-6 text-muted">
            The demonstration values are hidden. Select “Show fictional wallet example” to reveal
            the relationship between the keys and the address.
          </p>
        )}
      </SimulationSection>

      <SimulationSection id="wallet-explanation-heading" title="What this teaches">
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-parchment">A wallet manages keys</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              A wallet stores and uses key material. The private key is the secret that authorises
              spending. The public key is derived from it and can be shared. Keeping the private key
              safe is the central custody responsibility.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-parchment">An address receives bitcoin</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              An address is a shareable destination derived from the wallet&apos;s key material. You
              can give it to someone who wants to send you bitcoin. Seeing an address does not give
              someone the ability to spend from the wallet.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-amber/40 bg-amber/5 p-4">
          <h3 className="font-semibold text-parchment">What this demonstration does not do</h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
            <li>• It does not create a real wallet or a usable address.</li>
            <li>• It does not generate or display a seed phrase or valid private key.</li>
            <li>• It does not connect to a Bitcoin network or an external wallet service.</li>
          </ul>
        </div>
      </SimulationSection>
    </SimulationLayout>
  )
}

interface DemoCardProps {
  label: string
  value: string
  note: string
  secret?: boolean
}

function DemoCard({ label, value, note, secret = false }: DemoCardProps) {
  return (
    <div
      className={
        secret
          ? 'rounded-lg border border-amber/60 bg-amber/5 p-4'
          : 'rounded-lg border border-line bg-ink/40 p-4'
      }
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-amber">{label}</p>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-parchment">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{note}</p>
      <p className="mt-2 text-xs font-semibold text-amber">
        {secret ? 'Secret — do not share' : 'Shareable'}
      </p>
    </div>
  )
}

function RelationArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 md:flex-col">
      <span aria-hidden="true" className="text-2xl text-amber">
        →
      </span>
      <span className="text-center text-xs leading-5 text-muted">{label}</span>
    </div>
  )
}
