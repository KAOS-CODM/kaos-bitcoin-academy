import { useState } from 'react'
import { FictionalDataBadge } from '../FictionalDataBadge'
import { SimulationLayout } from '../SimulationLayout'
import { SimulationSection } from '../SimulationSection'
import {
  DEFAULT_KEY_VISIBILITY,
  DEMO_WALLET,
  SIMULATION_BY_ID,
} from '../data'
import type { KeyVisibilityState } from '../types'

type VisibilityKey = keyof KeyVisibilityState

const HIDDEN_VALUE = '••••••••••••••••'

export function KeyRelationshipsSimulation() {
  const [visibility, setVisibility] = useState<KeyVisibilityState>({
    ...DEFAULT_KEY_VISIBILITY,
  })

  const toggle = (key: VisibilityKey) => {
    setVisibility((current) => ({ ...current, [key]: !current[key] }))
  }

  const reset = () => {
    setVisibility({ ...DEFAULT_KEY_VISIBILITY })
  }

  return (
    <SimulationLayout meta={SIMULATION_BY_ID['key-relationships']}>
      <SimulationSection id="key-demo-heading" title="Reveal and hide fictional values">
        <div className="mt-2">
          <FictionalDataBadge />
        </div>
        <p className="mt-3 leading-7 text-muted">
          A private key must remain secret. A public key and an address are shareable. Use the
          controls below to compare them. The values are fake labels, not credentials.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ValuePanel
            label="Private key"
            tone="secret"
            visible={visibility.privateKeyVisible}
            value={DEMO_WALLET.privateKey}
            note="The secret side. In a real wallet, anyone with this can authorise spending."
            onToggle={() => toggle('privateKeyVisible')}
          />
          <ValuePanel
            label="Public key"
            tone="shareable"
            visible={visibility.publicKeyVisible}
            value={DEMO_WALLET.publicKey}
            note="The shareable side. It can help others verify that a signature came from the key owner."
            onToggle={() => toggle('publicKeyVisible')}
          />
          <ValuePanel
            label="Address"
            tone="shareable"
            visible={visibility.addressVisible}
            value={DEMO_WALLET.address}
            note="A shareable destination used to receive bitcoin. It is not a spending secret."
            onToggle={() => toggle('addressVisible')}
          />
        </div>

        {visibility.privateKeyVisible ? (
          <p
            role="status"
            className="mt-4 rounded-md border border-amber/50 bg-amber/10 p-3 text-sm leading-6 text-parchment"
          >
            The fictional private value is visible. In a real wallet, exposing a private key could
            let someone else spend the funds. This demonstration value is deliberately fake and
            unusable.
          </p>
        ) : null}

        <div className="mt-5">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment transition hover:border-amber"
          >
            Reset visibility
          </button>
        </div>
      </SimulationSection>

      <SimulationSection id="key-explanation-heading" title="What can be shared?">
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-ink/40 p-4">
            <h3 className="font-semibold text-parchment">Usually shareable</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
              <li>• An address, when you want to receive bitcoin.</li>
              <li>• A public key, when someone needs to verify a signature.</li>
              <li>• A transaction ID after a real transaction is broadcast.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-amber/50 bg-amber/5 p-4">
            <h3 className="font-semibold text-parchment">Must remain secret</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
              <li>• A private key.</li>
              <li>• A recovery or seed phrase.</li>
              <li>• Any backup that can restore the wallet.</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-amber/40 bg-amber/5 p-4">
          <h3 className="font-semibold text-parchment">If a real private key is exposed</h3>
          <p className="mt-2 text-sm leading-7 text-muted">
            Anyone who obtains it could move the funds. Changing a display name or a password on a
            website would not undo that exposure. The safer response is to move any remaining funds
            to a new wallet you control and to get help from a trusted wallet provider. This page
            cannot recover a real wallet.
          </p>
        </div>
      </SimulationSection>
    </SimulationLayout>
  )
}

interface ValuePanelProps {
  label: string
  tone: 'secret' | 'shareable'
  visible: boolean
  value: string
  note: string
  onToggle: () => void
}

function ValuePanel({ label, tone, visible, value, note, onToggle }: ValuePanelProps) {
  const secret = tone === 'secret'
  return (
    <div
      className={
        secret
          ? 'rounded-lg border border-amber/60 bg-amber/5 p-4'
          : 'rounded-lg border border-line bg-ink/40 p-4'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-amber">{label}</h3>
        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
          {secret ? 'Secret' : 'Shareable'}
        </span>
      </div>
      <p className="mt-3 break-all font-mono text-xs leading-6 text-parchment">
        {visible ? value : HIDDEN_VALUE}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">{note}</p>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={visible}
        className="mt-3 rounded-md border border-line px-3 py-2 text-xs font-semibold text-parchment transition hover:border-amber"
      >
        {visible ? `Hide ${label.toLowerCase()} demo value` : `Reveal ${label.toLowerCase()} demo value`}
      </button>
    </div>
  )
}
