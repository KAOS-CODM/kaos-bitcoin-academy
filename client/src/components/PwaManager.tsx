import { useInstallPrompt, useServiceWorkerUpdate } from '../pwa'

/**
 * The application update notice.
 *
 * A new version waits until the learner accepts it. Nothing reloads behind their back, and
 * the message says exactly what will happen.
 */
function UpdateNotice({ onApply }: { onApply: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-2/95 px-4 py-3 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-parchment">
          A new version of the Academy is ready. Reload to use it.
        </p>
        <button
          type="button"
          onClick={onApply}
          className="shrink-0 rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink transition hover:bg-amber-soft"
        >
          Reload and update
        </button>
      </div>
    </div>
  )
}

/**
 * The install control.
 *
 * It only appears when the browser has offered an install prompt, so the academy never
 * shows a button that cannot work.
 */
export function InstallButton() {
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <button
      type="button"
      onClick={promptInstall}
      className="rounded border border-line px-3 py-2 text-muted transition hover:border-amber hover:text-parchment"
    >
      Install app
    </button>
  )
}

/**
 * Progressive Web App controls.
 *
 * Rendered once by the application shell so both the update notice and the install control
 * are available on every page.
 */
export function PwaManager() {
  const { updateReady, applyUpdate } = useServiceWorkerUpdate()

  return (
    <>
      {updateReady ? <UpdateNotice onApply={applyUpdate} /> : null}
    </>
  )
}
