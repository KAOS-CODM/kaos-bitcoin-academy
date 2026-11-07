import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PlaygroundSafetyPanel } from './PlaygroundSafetyPanel'
import { SIMULATION_ONLY_LABEL, SIMULATIONS } from './data'
import type { SimulationMeta } from './types'

interface SimulationLayoutProps {
  meta: SimulationMeta
  children: ReactNode
}

export function SimulationLayout({ meta, children }: SimulationLayoutProps) {
  const currentIndex = SIMULATIONS.findIndex((simulation) => simulation.id === meta.id)
  const previous = currentIndex > 0 ? SIMULATIONS[currentIndex - 1] : undefined
  const next =
    currentIndex >= 0 && currentIndex < SIMULATIONS.length - 1
      ? SIMULATIONS[currentIndex + 1]
      : undefined

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-amber/60 bg-ink/95">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-6">
          <span className="rounded border border-amber/70 bg-amber/10 px-2 py-0.5 text-xs font-bold tracking-[0.18em] text-amber">
            {SIMULATION_ONLY_LABEL}
          </span>
          <p className="text-sm text-muted">
            Fictional demonstration. No real wallet, transaction, block, or network connection.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link to="/playground" className="hover:text-parchment">
            Bitcoin Playground
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-parchment">{meta.title}</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs uppercase tracking-widest text-amber">
            Simulation {String(meta.number).padStart(2, '0')} of {SIMULATIONS.length}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-parchment sm:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-muted">{meta.description}</p>
          <p className="mt-2 text-sm font-semibold text-amber">
            This page is a simulation. Every value and result is fictional.
          </p>
        </header>

        <div className="mt-6">
          <PlaygroundSafetyPanel />
        </div>

        <section
          aria-labelledby="simulation-objective"
          className="mt-6 rounded-lg border border-line bg-surface p-5"
        >
          <h2 id="simulation-objective" className="text-sm font-semibold uppercase tracking-widest text-amber">
            Learning objective
          </h2>
          <p className="mt-2 leading-7 text-parchment">{meta.objective}</p>
          <h3 className="mt-5 text-sm font-semibold text-parchment">How to use this simulation</h3>
          <ol className="mt-2 space-y-2">
            {meta.instructions.map((instruction, index) => (
              <li key={instruction} className="flex gap-3 text-sm leading-6 text-muted">
                <span
                  aria-hidden="true"
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line text-xs text-amber"
                >
                  {index + 1}
                </span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-8 space-y-6">{children}</div>

        <PlaygroundNavigation
          currentId={meta.id}
          previous={previous}
          next={next}
        />

        <aside
          aria-labelledby="leaving-playground-heading"
          className="mt-6 rounded-lg border border-line bg-surface p-5"
        >
          <h2 id="leaving-playground-heading" className="text-lg font-semibold text-parchment">
            When you leave the playground
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Nothing from this simulation is saved, sent, or connected to a wallet. Navigating away
            simply discards the demonstration. You can return to the playground to try another
            simulation.
          </p>
          <Link
            to="/playground"
            className="mt-3 inline-block text-sm font-semibold text-amber hover:text-amber-soft"
          >
            ← Back to the playground
          </Link>
        </aside>
      </div>
    </div>
  )
}

interface PlaygroundNavigationProps {
  currentId: SimulationMeta['id']
  previous: SimulationMeta | undefined
  next: SimulationMeta | undefined
}

function PlaygroundNavigation({ currentId, previous, next }: PlaygroundNavigationProps) {
  return (
    <nav
      aria-label="Playground simulations"
      className="mt-8 rounded-lg border border-line bg-surface p-5"
    >
      <h2 className="text-lg font-semibold text-parchment">All six simulations</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SIMULATIONS.map((simulation) => {
          const current = simulation.id === currentId
          return (
            <li key={simulation.id}>
              <Link
                to={`/playground/${simulation.id}`}
                aria-current={current ? 'page' : undefined}
                className={
                  current
                    ? 'flex items-start gap-2 rounded-md border border-amber/60 bg-amber/10 px-3 py-2 text-sm font-semibold text-parchment'
                    : 'flex items-start gap-2 rounded-md border border-line px-3 py-2 text-sm text-muted transition hover:border-amber/60 hover:text-parchment'
                }
              >
                <span aria-hidden="true" className="text-xs font-semibold text-amber">
                  {String(simulation.number).padStart(2, '0')}
                </span>
                <span>
                  {simulation.shortTitle}
                  {current ? <span className="block text-xs font-normal text-amber">Current</span> : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {previous ? (
          <Link
            to={`/playground/${previous.id}`}
            className="rounded-md border border-line px-3 py-2 text-sm text-parchment hover:border-amber"
          >
            ← Previous: {previous.shortTitle}
          </Link>
        ) : (
          <Link
            to="/playground"
            className="rounded-md border border-line px-3 py-2 text-sm text-parchment hover:border-amber"
          >
            ← Playground home
          </Link>
        )}
        {next ? (
          <Link
            to={`/playground/${next.id}`}
            className="rounded-md bg-amber px-3 py-2 text-sm font-semibold text-ink hover:bg-amber-soft"
          >
            Next: {next.shortTitle} →
          </Link>
        ) : (
          <Link
            to="/playground"
            className="rounded-md bg-amber px-3 py-2 text-sm font-semibold text-ink hover:bg-amber-soft"
          >
            Back to playground →
          </Link>
        )}
      </div>
    </nav>
  )
}
