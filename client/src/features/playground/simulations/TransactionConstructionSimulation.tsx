import { useState } from 'react'
import { FictionalDataBadge } from '../FictionalDataBadge'
import { SimulationLayout } from '../SimulationLayout'
import { SimulationSection } from '../SimulationSection'
import {
  DEFAULT_TRANSACTION_DRAFT,
  DEMO_TRANSACTION,
  DEMO_UTXOS,
  FEE_OPTIONS,
  SIMULATION_BY_ID,
} from '../data'
import { calculateTransaction, formatSats, parseSatsInput } from '../logic'
import type { TransactionDraft, TransactionResult } from '../types'

export function TransactionConstructionSimulation() {
  const [draft, setDraft] = useState<TransactionDraft>({ ...DEFAULT_TRANSACTION_DRAFT })
  const [reviewed, setReviewed] = useState(false)

  const selectedUtxo = DEMO_UTXOS.find((utxo) => utxo.id === draft.utxoId) ?? DEMO_UTXOS[0]
  const parsedAmount = parseSatsInput(draft.amountText)
  const result = calculateTransaction({
    utxoAmountSats: selectedUtxo.amountSats,
    amountSats: Number.isNaN(parsedAmount) ? 0 : parsedAmount,
    feeSats: draft.feeSats,
  })

  const updateDraft = (patch: Partial<TransactionDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setReviewed(false)
  }

  const reset = () => {
    setDraft({ ...DEFAULT_TRANSACTION_DRAFT })
    setReviewed(false)
  }

  return (
    <SimulationLayout meta={SIMULATION_BY_ID['transaction-construction']}>
      <SimulationSection id="transaction-demo-heading" title="Build a fictional transaction">
        <div className="mt-2">
          <FictionalDataBadge />
        </div>
        <p className="mt-3 leading-7 text-muted">
          Choose a fictional input (UTXO), enter an amount, and select an illustrative fee. The
          breakdown is arithmetic for the lesson only. Nothing is signed, broadcast, or paid.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-ink/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Fictional sender</p>
            <p className="mt-1 font-medium text-parchment">{DEMO_TRANSACTION.sender}</p>
          </div>
          <div className="rounded-md border border-line bg-ink/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Fictional receiver</p>
            <p className="mt-1 font-medium text-parchment">{DEMO_TRANSACTION.receiver}</p>
          </div>
        </div>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault()
            setReviewed(true)
          }}
        >
          <fieldset>
            <legend className="text-sm font-semibold text-parchment">
              Choose a fictional input (UTXO)
            </legend>
            <div className="mt-3 space-y-2">
              {DEMO_UTXOS.map((utxo) => {
                const selected = draft.utxoId === utxo.id
                return (
                  <label
                    key={utxo.id}
                    className={
                      selected
                        ? 'flex cursor-pointer items-start gap-3 rounded-md border border-amber/60 bg-amber/5 px-3 py-3 text-sm leading-6 text-parchment'
                        : 'flex cursor-pointer items-start gap-3 rounded-md border border-line px-3 py-3 text-sm leading-6 text-muted hover:border-amber/50'
                    }
                  >
                    <input
                      type="radio"
                      name="demo-utxo"
                      value={utxo.id}
                      checked={selected}
                      onChange={() => updateDraft({ utxoId: utxo.id })}
                      className="mt-1 h-4 w-4 accent-amber"
                    />
                    <span>
                      <span className="block font-medium text-parchment">{utxo.label}</span>
                      <span className="block text-xs leading-5 text-muted">
                        {formatSats(utxo.amountSats)} · {utxo.txid}:{utxo.outputIndex}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="transaction-amount" className="text-sm font-semibold text-parchment">
                Amount to include (sats)
              </label>
              <input
                id="transaction-amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={draft.amountText}
                onChange={(event) => updateDraft({ amountText: event.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2.5 text-parchment"
              />
              <p className="mt-1 text-xs leading-5 text-muted">
                Enter a whole number of sats. 1 bitcoin is divided into 100,000,000 sats.
              </p>
            </div>
            <div>
              <label htmlFor="transaction-fee" className="text-sm font-semibold text-parchment">
                Illustrative fee
              </label>
              <select
                id="transaction-fee"
                value={String(draft.feeSats)}
                onChange={(event) => updateDraft({ feeSats: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2.5 text-parchment"
              >
                {FEE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs leading-5 text-muted">
                The fee is the difference between the input and the outputs.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft"
            >
              Build simulated transaction
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment transition hover:border-amber"
            >
              Reset demonstration
            </button>
          </div>
        </form>

        {reviewed ? (
          result.valid ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 rounded-lg border border-amber/50 bg-amber/5 p-4"
            >
              <h3 className="font-semibold text-parchment">Simulated transaction breakdown</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                This is a fictional calculation. It has not been signed, broadcast, or paid.
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <BreakdownRow label="Input total" value={formatSats(result.inputTotalSats)} />
                <BreakdownRow
                  label="Recipient output"
                  value={formatSats(result.recipientOutputSats)}
                />
                <BreakdownRow
                  label="Change output"
                  value={
                    result.hasChange
                      ? formatSats(result.changeOutputSats)
                      : 'No change output in this example'
                  }
                />
                <BreakdownRow label="Illustrative fee" value={formatSats(result.feeSats)} />
              </dl>
              <p className="mt-4 rounded-md border border-line/70 bg-ink/40 p-3 text-sm leading-6 text-parchment">
                Inputs = outputs + fee: {formatSats(result.inputTotalSats)} ={' '}
                {formatSats(result.totalOutputSats)} + {formatSats(result.feeSats)}
              </p>
            </div>
          ) : (
            <div
              role="alert"
              className="mt-5 rounded-md border border-danger/50 bg-danger/10 p-3 text-sm text-parchment"
            >
              <p className="font-semibold">Check the demonstration values</p>
              <ul className="mt-2 space-y-1 text-muted">
                {result.errors.map((error) => (
                  <li key={error}>• {error}</li>
                ))}
              </ul>
            </div>
          )
        ) : null}
      </SimulationSection>

      <SimulationSection id="transaction-explanation-heading" title="How UTXOs and outputs work">
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-parchment">Inputs consume UTXOs</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              Bitcoin does not use a single account balance in the way a bank does. A wallet controls
              spendable outputs called UTXOs. A transaction consumes one or more of them as inputs.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-parchment">Outputs create new spendable amounts</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              The transaction creates outputs for the recipient and usually for change. The change
              output returns to the sender&apos;s wallet. The fee is what remains after outputs are
              subtracted from inputs.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-amber/40 bg-amber/5 p-4">
          <h3 className="font-semibold text-parchment">What is missing in this demonstration</h3>
          <p className="mt-2 text-sm leading-7 text-muted">
            A real transaction would need a valid signature and a serialised format before it could
            be broadcast. This page deliberately does not create either one, and it never connects to
            a Bitcoin network.
          </p>
        </div>
      </SimulationSection>
    </SimulationLayout>
  )
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line/70 bg-ink/40 p-3">
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-1 break-words font-medium text-parchment">{value}</dd>
    </div>
  )
}
