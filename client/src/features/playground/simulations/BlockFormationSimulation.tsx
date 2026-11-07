import { useState } from 'react'
import { FictionalDataBadge } from '../FictionalDataBadge'
import { SimulationLayout } from '../SimulationLayout'
import { SimulationSection } from '../SimulationSection'
import {
  DEFAULT_BLOCK_SELECTION,
  DEMO_BLOCK_TRANSACTIONS,
  DEMO_CURRENT_BLOCK,
  DEMO_PREVIOUS_BLOCK,
  SIMULATION_BY_ID,
} from '../data'
import { buildBlock, formatSats } from '../logic'

export function BlockFormationSimulation() {
  const [selectedIds, setSelectedIds] = useState<string[]>([...DEFAULT_BLOCK_SELECTION])
  const block = buildBlock(DEMO_BLOCK_TRANSACTIONS, selectedIds, DEMO_PREVIOUS_BLOCK.hash)

  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const selectAll = () => {
    setSelectedIds(DEMO_BLOCK_TRANSACTIONS.map((transaction) => transaction.id))
  }

  const reset = () => {
    setSelectedIds([...DEFAULT_BLOCK_SELECTION])
  }

  return (
    <SimulationLayout meta={SIMULATION_BY_ID['block-formation']}>
      <SimulationSection id="block-demo-heading" title="Assemble a fictional block">
        <div className="mt-2">
          <FictionalDataBadge />
        </div>
        <p className="mt-3 leading-7 text-muted">
          Select fictional transactions to put into the demo block. The block header changes as the
          transaction data changes. These hashes and totals are illustrative, not real network data.
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-parchment">
            Select fictional transactions for the demo block
          </legend>
          <p id="block-selection-summary" className="mt-1 text-sm text-muted">
            {block.transactionCount} of {DEMO_BLOCK_TRANSACTIONS.length} fictional transactions
            selected.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {DEMO_BLOCK_TRANSACTIONS.map((transaction) => {
              const selected = selectedIds.includes(transaction.id)
              return (
                <label
                  key={transaction.id}
                  className={
                    selected
                      ? 'flex cursor-pointer items-start gap-3 rounded-md border border-amber/60 bg-amber/5 px-3 py-3 text-sm leading-6 text-parchment'
                      : 'flex cursor-pointer items-start gap-3 rounded-md border border-line px-3 py-3 text-sm leading-6 text-muted hover:border-amber/50'
                  }
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(transaction.id)}
                    aria-describedby="block-selection-summary"
                    className="mt-1 h-4 w-4 accent-amber"
                  />
                  <span>
                    <span className="block font-medium text-parchment">{transaction.label}</span>
                    <span className="block text-xs leading-5 text-muted">
                      {formatSats(transaction.amountSats)}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-parchment transition hover:border-amber"
          >
            Add all demo transactions
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
            className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-parchment transition hover:border-amber disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear block
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-amber px-3 py-2 text-sm font-semibold text-ink transition hover:bg-amber-soft"
          >
            Reset to initial selection
          </button>
        </div>
      </SimulationSection>

      <SimulationSection id="block-visual-heading" title="The demo chain">
        <p className="mt-2 text-sm leading-6 text-muted">
          The previous-block hash is part of the current block header. That link is what makes the
          blocks a chain: changing an earlier block would change its hash and break the link used by
          later blocks.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="rounded-lg border border-line bg-ink/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber">
              {DEMO_PREVIOUS_BLOCK.label}
            </p>
            <dl className="mt-3 space-y-3">
              <BlockField label="Demo height" value={String(DEMO_PREVIOUS_BLOCK.height)} />
              <BlockField label="Block hash" value={DEMO_PREVIOUS_BLOCK.hash} mono />
            </dl>
          </div>

          <div className="flex items-center justify-center gap-2 md:flex-col">
            <span aria-hidden="true" className="text-2xl text-amber">
              →
            </span>
            <span className="max-w-32 text-center text-xs leading-5 text-muted">
              previous hash is included in the next header
            </span>
          </div>

          <div className="rounded-lg border border-amber/60 bg-amber/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber">
              {DEMO_CURRENT_BLOCK.label}
            </p>
            <dl className="mt-3 space-y-3">
              <BlockField label="Demo height" value={String(DEMO_CURRENT_BLOCK.height)} />
              <BlockField label="Previous block hash" value={block.previousHash} mono />
              <BlockField
                label="Transaction digest (illustrative)"
                value={block.transactionDigest}
                mono
              />
              <BlockField label="Nonce" value={String(DEMO_CURRENT_BLOCK.nonce)} />
              <BlockField label="Block hash" value={block.blockHash} mono />
            </dl>
            <div className="mt-4 rounded-md border border-line/70 bg-ink/40 p-3">
              <h3 className="text-sm font-semibold text-parchment">
                Transaction data ({block.transactionCount})
              </h3>
              {block.transactions.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs leading-5 text-muted">
                  {block.transactions.map((transaction) => (
                    <li key={transaction.id}>
                      {transaction.label} · {formatSats(transaction.amountSats)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted">
                  This demo block currently contains no transactions.
                </p>
              )}
              <p className="mt-2 text-xs font-semibold text-parchment">
                Total demonstration value: {formatSats(block.totalSats)}
              </p>
            </div>
          </div>
        </div>
      </SimulationSection>

      <SimulationSection id="block-explanation-heading" title="What the block header contains">
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-parchment">The header commits to data</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              A block header includes a reference to the previous block, a digest of the transaction
              data, a nonce, and other fields. Changing the selected transactions changes the digest
              and the demonstration block hash.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-parchment">This is not real Bitcoin data</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              Real Bitcoin blocks use SHA-256 and a Merkle tree. This page uses a small illustrative
              hash and fictional transactions so the structure is easy to see. It does not fetch live
              network data.
            </p>
          </div>
        </div>
        <p className="mt-5 rounded-md border border-amber/40 bg-amber/5 p-4 text-sm leading-7 text-muted">
          The block shown here is a teaching model only. It is not a real block, and it is not
          connected to a Bitcoin node.
        </p>
      </SimulationSection>
    </SimulationLayout>
  )
}

function BlockField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd
        className={
          mono
            ? 'mt-1 break-all font-mono text-xs leading-5 text-parchment'
            : 'mt-1 text-sm text-parchment'
        }
      >
        {value}
      </dd>
    </div>
  )
}
