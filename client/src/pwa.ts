import { useCallback, useEffect, useState } from 'react'

/**
 * Progressive Web App support.
 *
 * The service worker only ever caches the application shell and static assets. It never
 * caches an API response, never touches a cross-origin request, and never replays a
 * state-changing action, so no account data, wallet material, or payment can be stored or
 * replayed by the browser.
 */

const SERVICE_WORKER_URL = '/sw.js'

/** True when the browser exposes the service worker API. */
export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
}

/**
 * Register the service worker.
 *
 * Registration is skipped during development, where a cached shell would only hide code
 * changes. The worker never calls `skipWaiting()` on its own: a new version waits until the
 * learner accepts the update prompt.
 */
export function registerServiceWorker(): void {
  if (!isServiceWorkerSupported()) return
  if (import.meta.env.DEV) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => {
      // A failed registration only removes the offline capability. The academy still works.
    })
  })
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Watch for a new application version that is waiting to take over.
 *
 * The prompt is shown to the learner, and the new version is only activated when they
 * accept it. Nothing is reloaded behind their back.
 */
export function useServiceWorkerUpdate(): {
  updateReady: boolean
  applyUpdate: () => void
} {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (!isServiceWorkerSupported()) return

    let reloading = false

    const trackWorker = (registration: ServiceWorkerRegistration): void => {
      const installing = registration.installing
      if (!installing) return

      installing.addEventListener('statechange', () => {
        if (installing.state !== 'installed') return
        // A worker that installs while another one controls the page is an update.
        if (navigator.serviceWorker.controller) setUpdateReady(true)
      })
    }

    const onRegistration = (registration: ServiceWorkerRegistration): void => {
      trackWorker(registration)
      registration.addEventListener('updatefound', () => {
        trackWorker(registration)
      })
    }

    navigator.serviceWorker.ready.then(onRegistration).catch(() => {
      // No controller yet. The page still works without offline support.
    })

    const onControllerChange = (): void => {
      if (!reloading) return
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    if (!isServiceWorkerSupported()) return
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
      })
      .catch(() => {
        // Nothing is waiting. The learner can simply reload.
        window.location.reload()
      })
  }, [])

  return { updateReady, applyUpdate }
}

/**
 * Track the browser's install prompt so the academy can offer installation.
 *
 * The prompt is stored, never shown automatically, and is only offered once the browser
 * says it is available.
 */
export function useInstallPrompt(): {
  canInstall: boolean
  promptInstall: () => void
} {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    const onInstalled = (): void => {
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(() => {
    if (!deferred) return
    void deferred.prompt().catch(() => {
      // The learner dismissed the prompt or the browser refused it.
    })
  }, [deferred])

  return { canInstall: deferred !== null, promptInstall }
}
