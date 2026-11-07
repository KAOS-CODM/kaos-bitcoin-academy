import { Link } from 'react-router-dom'
import { PlaygroundSafetyPanel } from '../features/playground/PlaygroundSafetyPanel'
import { SIMULATIONS } from '../features/playground/data'

export function Playground() {
  return (
    <div>
      <section className="border-b border-line/60">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">
            Interactive learning · Six simulations
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-parchment sm:text-5xl">
            Bitcoin Playground
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
            Experiment with the ideas behind wallets, keys, transactions, blocks, and proof of work.
            Every demonstration is fictional, local to this page, and disconnected from any Bitcoin
            network.
          </p>
          <p className="mt-3 text-sm font-semibold text-amber">
            Entering the playground does not create a wallet, a transaction, or a connection to a
            real network.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <PlaygroundSafetyPanel />
      </section>

      <section aria-labelledby="playground-list-heading" className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="playground-list-heading" className="text-2xl font-semibold text-parchment">
              Choose a simulation
            </h2>
            <p className="mt-2 max-w-2xl text-muted">
              Each simulation opens on its own page with one objective, short instructions, an
              interactive area, and an explanation of what the demonstration does not do.
            </p>
          </div>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SIMULATIONS.map((simulation) => (
            <li key={simulation.id}>
              <Link
                to={`/playground/${simulation.id}`}
                className="group flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition hover:border-amber/60"
              >
                <span className="text-xs font-semibold uppercase tracking-widest text-amber">
                  Simulation {String(simulation.number).padStart(2, '0')}
                </span>
                <span className="mt-2 text-lg font-semibold text-parchment group-hover:text-amber-soft">
                  {simulation.title}
                </span>
                <span className="mt-2 text-sm leading-6 text-muted">{simulation.description}</span>
                <span className="mt-4 text-sm font-semibold text-amber">Open simulation →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line/60 bg-surface/40">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-parchment">Before you begin</h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              The playground is for understanding, not for handling money. It never asks for a
              recovery phrase, private key, wallet connection, or personal information. If you want
              to practise with a real wallet, use a small test amount and follow the wallet
              provider&apos;s safety guidance.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-parchment">When you leave</h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              Leaving a simulation discards its demonstration state. No result is saved to your
              account, and no result represents a real transaction, confirmation, payment, or
              settlement. You can return to the course catalogue at any time.
            </p>
            <Link
              to="/courses"
              className="mt-3 inline-block text-sm font-semibold text-amber hover:text-amber-soft"
            >
              ← Back to courses
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
