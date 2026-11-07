import { useEffect, useState } from 'react'
import { FictionalDataBadge } from '../FictionalDataBadge'
import { SimulationLayout } from '../SimulationLayout'
import { SimulationSection } from '../SimulationSection'
import { DEMO_MINING, SIMULATION_BY_ID } from '../data'
import { advanceMining, createMiningState } from '../logic'
import type { MiningState } from '../types'

function initialState(): MiningState {
  return createMiningState(DEMO_MINING.seed, DEMO_MINING.targetPrefix, DEMO_MINING.maxAttempts)
}

export function MiningSimulation() {
  const [mining, setMining] = useState<MiningState>(initialState)

  useEffect(() => {
    if (!mining.running) return

    const timer = window.setInterval(() => {
      setMining((current) => advanceMining(current, DEMO_MINING.batchSize))
    }, DEMO_MINING.intervalMs)

    return () => window.clearInterval(timer)
  }, [mining.running])

  const start = () => {
    setMining((current) => ({
      ...current,
      running: !current.found && current.attempts < current.maxAttempts,
    }))
  }

  const pause = () => {
    setMining((current) => ({ ...current, running: false }))
  }

  const reset = () => {
    setMining(initialState())
  }

  const exhausted = mining.attempts >= mining.maxAttempts
  const finished = mining.found || exhausted

  return (
    <SimulationLayout meta={SIMULATION_BY_ID.mining}>
      <SimulationSection id="mining-demo-heading" title="Run the mining demonstration">
        <div className="mt-2">
          <FictionalDataBadge />
        </div>
        <p className="mt-3 leading-7 text-muted">
          This lightweight demonstration changes a nonce and checks whether the demo hash begins
          with the target prefix. It uses a tiny teaching hash, not SHA-256, and it performs only a
          bounded number of attempts.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={start}
            disabled={mining.running || mining.found || exhausted}
            className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start mining demonstration
          </button>
          <button
            type="button"
            onClick={pause}
            disabled={!mining.running}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment transition hover:border-amber disabled:cursor-not-allowed disabled:opacity-60"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment transition hover:border-amber"
          >
            Reset demonstration
          </button>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <Metric label="Nonce attempts" value={mining.attempts.toLocaleString('en-US')} />
          <Metric label="Current nonce" value={mining.nonce.toLocaleString('en-US')} />
          <Metric label="Current demo hash" value={mining.hash} mono />
          <Metric
            label="Target condition"
            value={`Demo hash must begin with ${DEMO_MINING.targetPrefix}`}
          />
        </dl>

        <div className="mt-5">
          <label htmlFor="mining-progress" className="text-sm font-semibold text-parchment">
            Attempts against the demonstration limit
          </label>
          <progress
            id="mining-progress"
            value={Math.min(mining.attempts, mining.maxAttempts)}
            max={mining.maxAttempts}
            aria-label="Mining demonstration attempts against the attempt limit"
            className="mt-2 block h-2.5 w-full overflow-hidden rounded-full bg-surface-2 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-amber [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-amber"
          />
          <p className="mt-1 text-xs text-muted">
            {mining.attempts.toLocaleString('en-US')} of{' '}
            {mining.maxAttempts.toLocaleString('en-US')} maximum demonstration attempts
          </p>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="mt-5 rounded-lg border border-amber/50 bg-amber/5 p-4"
        >
          {mining.found ? (
            <>
              <h3 className="font-semibold text-parchment">Demonstration target reached</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                The demo hash {mining.hash} begins with {DEMO_MINING.targetPrefix} after{' '}
                {mining.attempts.toLocaleString('en-US')} attempts. This is a simplified teaching
                result, not a mined Bitcoin block.
              </p>
            </>
          ) : exhausted ? (
            <>
              <h3 className="font-semibold text-parchment">Demonstration limit reached</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                The demonstration stopped after {mining.attempts.toLocaleString('en-US')} attempts
                without reaching the target. In a real mining attempt, the process would keep going
                with new block candidates.
              </p>
            </>
          ) : mining.running ? (
            <>
              <h3 className="font-semibold text-parchment">Mining demonstration running</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                The nonce and hash are changing. The demonstration pauses automatically when it finds
                a hash that begins with {DEMO_MINING.targetPrefix}.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-parchment">Ready to start</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                Nothing has been mined. Start the demonstration to watch the nonce attempts change.
              </p>
            </>
          )}
        </div>
      </SimulationSection>

      <SimulationSection id="mining-explanation-heading" title="Why miners repeat work">
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-parchment">A target is easy to check</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              A miner changes the nonce and hashes the block header. Anyone can check a result by
              hashing the same header once. Finding a result that satisfies the target, however,
              requires many attempts.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-parchment">Work makes history costly to rewrite</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              Proof of work links each block to the previous one. To rewrite an old block, an
              attacker would need to redo the work for that block and every later block. That cost is
              part of how the chain resists tampering.
            </p>
          </div>
        </div>
        <p className="mt-5 rounded-md border border-amber/40 bg-amber/5 p-4 text-sm leading-7 text-muted">
          This page does not mine a real block, does not use SHA-256, and does not connect to a
          Bitcoin network. It is a bounded classroom model. {finished ? 'The demonstration has finished or reached its limit.' : ''}
        </p>
      </SimulationSection>
    </SimulationLayout>
  )
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-line/70 bg-ink/40 p-3">
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</dt>
      <dd
        className={
          mono
            ? 'mt-1 break-all font-mono text-sm leading-6 text-parchment'
            : 'mt-1 break-words font-medium text-parchment'
        }
      >
        {value}
      </dd>
    </div>
  )
}
