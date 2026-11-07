import { PLAYGROUND_SAFETY_POINTS, SIMULATION_ONLY_LABEL } from './data'

export function PlaygroundSafetyPanel() {
  return (
    <section
      aria-labelledby="playground-safety-heading"
      className="rounded-lg border border-amber/50 bg-amber/5 p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-amber/70 bg-amber/10 px-2 py-0.5 text-xs font-bold tracking-[0.18em] text-amber">
          {SIMULATION_ONLY_LABEL}
        </span>
        <h2 id="playground-safety-heading" className="text-lg font-semibold text-parchment">
          Safety rules for this playground
        </h2>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {PLAYGROUND_SAFETY_POINTS.map((point) => (
          <li key={point} className="flex gap-2 text-sm leading-6 text-muted">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
