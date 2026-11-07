import { useState } from 'react'
import { FictionalDataBadge } from '../FictionalDataBadge'
import { SimulationLayout } from '../SimulationLayout'
import { SimulationSection } from '../SimulationSection'
import {
  CONFIRMATION_STAGES,
  DEMO_TRANSACTION,
  SIMULATION_BY_ID,
} from '../data'
import { stageStatus } from '../logic'

export function BroadcastingSimulation() {
  const [stageIndex, setStageIndex] = useState(0)
  const currentStage = CONFIRMATION_STAGES[stageIndex]
  const atEnd = stageIndex >= CONFIRMATION_STAGES.length - 1

  return (
    <SimulationLayout meta={SIMULATION_BY_ID.broadcasting}>
      <SimulationSection id="broadcast-demo-heading" title="Advance the simulated timeline">
        <div className="mt-2">
          <FictionalDataBadge />
        </div>
        <p className="mt-3 leading-7 text-muted">
          This timeline is a teaching illustration. No transaction is sent to the Bitcoin network,
          and no real confirmation is produced. Read each stage before advancing.
        </p>

        <div
          role="status"
          aria-live="polite"
          className="mt-5 rounded-lg border border-amber/50 bg-amber/5 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-amber">
            Current stage {stageIndex + 1} of {CONFIRMATION_STAGES.length}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-parchment">{currentStage.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{currentStage.detail}</p>
          <p className="mt-2 text-sm font-semibold text-parchment">
            Simulated confirmations: {currentStage.confirmations} · Demo transaction:{' '}
            {DEMO_TRANSACTION.id}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setStageIndex((current) => Math.min(current + 1, CONFIRMATION_STAGES.length - 1))
            }
            disabled={atEnd}
            className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            Advance simulated timeline
          </button>
          <button
            type="button"
            onClick={() => setStageIndex(0)}
            disabled={stageIndex === 0}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment transition hover:border-amber disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset timeline
          </button>
        </div>

        <ol className="mt-6 space-y-3">
          {CONFIRMATION_STAGES.map((stage, index) => {
            const status = stageStatus(index, stageIndex)
            const statusLabel =
              status === 'complete' ? 'Complete' : status === 'current' ? 'Current stage' : 'Not reached'
            return (
              <li
                key={stage.id}
                aria-current={status === 'current' ? 'step' : undefined}
                className={
                  status === 'current'
                    ? 'rounded-lg border border-amber/60 bg-amber/10 p-4'
                    : status === 'complete'
                      ? 'rounded-lg border border-line bg-ink/40 p-4'
                      : 'rounded-lg border border-line/70 bg-ink/20 p-4'
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-medium text-parchment">
                    {index + 1}. {stage.title}
                  </h3>
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted">{stage.detail}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber">
                  {stage.confirmations === 0
                    ? 'No simulated confirmations yet'
                    : `${stage.confirmations} simulated confirmation${stage.confirmations === 1 ? '' : 's'}`}
                </p>
              </li>
            )
          })}
        </ol>
      </SimulationSection>

      <SimulationSection id="broadcast-explanation-heading" title="What the stages mean">
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-parchment">Broadcast and propagation</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              In a real workflow, a wallet signs the transaction and sends it to peers. Those peers
              check the transaction against network rules before passing it on. This simulation
              skips signing and shows only the idea of sharing.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-parchment">Blocks and confirmations</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              A transaction is included in a block when a miner finds a valid block. Each later block
              adds another confirmation. More confirmations generally increase confidence, but they
              are not an absolute guarantee.
            </p>
          </div>
        </div>
        <p className="mt-5 rounded-md border border-amber/40 bg-amber/5 p-4 text-sm leading-7 text-muted">
          No transaction is sent to the Bitcoin network. Every stage on this page is a fictional
          demonstration, and the confirmation count is not a real settlement.
        </p>
      </SimulationSection>
    </SimulationLayout>
  )
}
