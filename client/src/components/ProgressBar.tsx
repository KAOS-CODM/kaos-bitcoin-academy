interface ProgressBarProps {
  percent: number
  completed: number
  total: number
  label: string
  size?: 'sm' | 'md'
}

export function ProgressBar({ percent, completed, total, label, size = 'md' }: ProgressBarProps) {
  const value = Math.max(0, Math.min(100, percent))

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs text-muted">
        <span>{label}</span>
        <span>
          {completed} of {total} lessons
        </span>
      </div>
      {/*
        A native <progress> exposes role="progressbar" and its values to assistive
        technology, and needs no inline style — so the production CSP can keep
        style-src 'self' without 'unsafe-inline'.
      */}
      <progress
        value={value}
        max={100}
        aria-label={label}
        className={`block w-full overflow-hidden rounded-full bg-surface-2 ${
          size === 'sm' ? 'h-1.5' : 'h-2.5'
        } [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-amber [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-amber`}
      />
    </div>
  )
}
