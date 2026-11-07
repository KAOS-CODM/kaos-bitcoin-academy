import type { ReactNode } from 'react'

interface SimulationSectionProps {
  id: string
  title: string
  children: ReactNode
}

export function SimulationSection({ id, title, children }: SimulationSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-lg border border-line bg-surface p-5 sm:p-6"
    >
      <h2 id={id} className="text-xl font-semibold text-parchment">
        {title}
      </h2>
      {children}
    </section>
  )
}
