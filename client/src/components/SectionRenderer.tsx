import type { LessonSection } from '../lib/types'

const calloutStyles = {
  note: 'border-amber/40 bg-surface',
  tip: 'border-amber/40 bg-surface',
  warning: 'border-danger/50 bg-surface',
} as const

const calloutLabels = {
  note: 'Note',
  tip: 'Try this',
  warning: 'Important',
} as const

export function SectionRenderer({ sections }: { sections: LessonSection[] }) {
  return (
    <div className="space-y-5">
      {sections.map((section, index) => {
        const key = `${section.type}-${index}`

        switch (section.type) {
          case 'heading':
            return (
              <h2 key={key} className="pt-4 text-xl font-semibold text-parchment sm:text-2xl">
                {section.heading}
              </h2>
            )

          case 'paragraph':
            return (
              <div key={key} className="space-y-4">
                {section.paragraphs?.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="text-[1.02rem] leading-8 text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            )

          case 'callout': {
            const variant = section.variant ?? 'note'
            return (
              <aside
                key={key}
                className={`rounded-lg border-l-4 p-4 sm:p-5 ${calloutStyles[variant]}`}
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber">
                  {calloutLabels[variant]}
                  {section.title ? ` — ${section.title}` : ''}
                </p>
                {section.paragraphs?.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="text-sm leading-7 text-muted">
                    {paragraph}
                  </p>
                ))}
              </aside>
            )
          }

          case 'example':
            return (
              <figure key={key} className="rounded-lg border border-line bg-surface-2/60 p-5">
                <figcaption className="mb-3 text-sm font-semibold text-amber-soft">
                  Example: {section.title}
                </figcaption>
                <div className="space-y-3">
                  {section.paragraphs?.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className="text-sm leading-7 text-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </figure>
            )

          case 'list':
            return (
              <ul key={key} className="space-y-2.5 pl-1">
                {section.items?.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex gap-3 text-[1.02rem] leading-7 text-muted">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )

          case 'terms':
            return (
              <dl key={key} className="space-y-3 rounded-lg border border-line bg-surface p-5">
                {section.terms?.map((term) => (
                  <div key={term.term}>
                    <dt className="text-sm font-semibold text-parchment">{term.term}</dt>
                    <dd className="text-sm leading-7 text-muted">{term.definition}</dd>
                  </div>
                ))}
              </dl>
            )

          case 'reflection':
            return (
              <aside
                key={key}
                className="rounded-lg border border-amber/40 bg-amber/5 p-5"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber">
                  Pause and think
                </p>
                <p className="text-[1.02rem] leading-7 text-parchment">{section.prompt}</p>
              </aside>
            )

          default:
            return null
        }
      })}
    </div>
  )
}
