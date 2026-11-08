import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { NWCClient } from '@getalby/sdk/nwc'
import { WALLET_ACTIVITY_LESSON } from '../features/wallet/activity'
import {
  ALBY_RELAY,
  COINOS_RELAY,
  WalletClientSession,
  describeWalletError,
  type SanitizedGetInfoResponse,
} from '../features/wallet/nwc'
import { WalletMethods } from '../features/wallet/WalletMethods'

type StatusKind = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'

interface WalletStatus {
  kind: StatusKind
  message: string
}

const IDLE_STATUS: WalletStatus = {
  kind: 'idle',
  message: 'No wallet connected. Connecting a wallet is optional.',
}

const FIELD_ROWS: Array<[keyof SanitizedGetInfoResponse, string]> = [
  ['alias', 'Alias'],
  ['network', 'Network'],
  ['pubkey', 'Wallet public key'],
  ['color', 'Color'],
  ['block_height', 'Block height'],
  ['block_hash', 'Block hash'],
]

function createSession(): WalletClientSession {
  return new WalletClientSession(
    (connection) =>
      new NWCClient({
        walletPubkey: connection.walletPubkey,
        relayUrls: [connection.relay],
        secret: connection.secret,
        requireSecret: true,
      }),
  )
}

function statusClasses(kind: StatusKind): string {
  switch (kind) {
    case 'error':
      return 'border-danger/50 bg-danger/10 text-danger'
    case 'connected':
      return 'border-amber/50 bg-amber/10 text-parchment'
    case 'connecting':
      return 'border-amber/40 bg-amber/5 text-parchment'
    case 'disconnected':
      return 'border-line bg-surface-2 text-parchment'
    default:
      return 'border-line bg-surface text-muted'
  }
}

function WalletInfo({ info }: { info: SanitizedGetInfoResponse }) {
  const rows = FIELD_ROWS.flatMap(([key, label]) => {
    const value = info[key]
    if (value === undefined) return []
    return [{ key, label, value: String(value) }]
  })

  return (
    <section
      aria-labelledby="wallet-info-heading"
      className="mt-6 rounded-lg border border-line bg-surface p-5"
    >
      <h2 id="wallet-info-heading" className="text-lg font-semibold text-parchment">
        Wallet-reported information
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        These values were returned by your wallet for <code>get_info</code>. They describe the
        wallet&apos;s report, not a payment or balance.
      </p>

      <dl className="mt-4 divide-y divide-line/70">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
            <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
              {row.label}
            </dt>
            <dd className="break-words text-sm text-parchment">{row.value}</dd>
          </div>
        ))}
      </dl>

      <WalletMethods methods={info.methods} />

      {info.extensions && info.extensions.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-parchment">Reported extensions</h3>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Reported wallet extensions">
            {info.extensions.map((extension) => (
              <li
                key={extension}
                className="rounded-full border border-line bg-ink px-3 py-1 text-xs text-parchment"
              >
                {extension}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

export function Wallet() {
  const [session] = useState(createSession)
  const [uri, setUri] = useState('')
  const [status, setStatus] = useState<WalletStatus>(IDLE_STATUS)
  const [info, setInfo] = useState<SanitizedGetInfoResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    const resetForLifecycle = (message: string) => {
      requestId.current += 1
      session.disconnect()
      setUri('')
      setInfo(null)
      setBusy(false)
      setStatus({ kind: 'idle', message })
    }

    const onPageHide = () => {
      resetForLifecycle('The page was hidden, so the wallet connection was closed.')
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        resetForLifecycle('The page was restored. No wallet connection is active.')
      }
    }

    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)

    return () => {
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      requestId.current += 1
      session.disconnect()
    }
  }, [session])

  function disconnect() {
    requestId.current += 1
    session.disconnect()
    setUri('')
    setInfo(null)
    setBusy(false)
    setStatus({
      kind: 'disconnected',
      message:
        'Disconnected and cleared this page. Revoke the connection in your wallet if you no longer need it.',
    })
  }

  async function onConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const raw = uri.trim()
    if (raw === '') {
      setStatus({
        kind: 'error',
        message: 'Paste a fresh NWC connection URI before connecting.',
      })
      return
    }

    const attempt = ++requestId.current
    setUri('')
    setInfo(null)
    setBusy(true)
    setStatus({
      kind: 'connecting',
      message: 'Validating the connection URI locally, then requesting only get_info…',
    })

    try {
      const result = await session.connect(raw)
      if (attempt !== requestId.current || result.status === 'stale') return

      setInfo(result.info)
      setBusy(false)
      setStatus({
        kind: 'connected',
        message: `Your wallet answered get_info at ${new Date().toLocaleTimeString()}. The fields below are the wallet-reported values.`,
      })
    } catch (error) {
      if (attempt !== requestId.current) return
      setBusy(false)
      setStatus({ kind: 'error', message: describeWalletError(error) })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-amber">Optional wallet connection</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-parchment sm:text-4xl">
          Connect a Lightning wallet with NWC
        </h1>
        <p className="mt-3 text-lg leading-8 text-muted">
          Nostr Wallet Connect (NWC) lets this academy ask your existing Lightning wallet for wallet
          information. The academy does not store or control your funds. Your wallet remains the
          authority for anything it authorizes.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          The academy currently accepts only NWC URIs that use the Coinos relay or the Alby relay.
          The wallet&apos;s generated connection URI determines which relay is used.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          This page currently requests only <code>get_info</code>. It does not create invoices, make
          payments, query a balance, or perform transactions. Wallet connection is optional: courses,
          lessons, quizzes, the playground, and the AI Tutor remain available without it.
        </p>
      </header>

      <div className="mt-6 rounded-lg border border-amber/40 bg-amber/5 p-4 text-sm leading-6 text-muted">
        <p className="font-semibold text-amber">Never share a seed phrase or private key.</p>
        <p className="mt-1">
          An NWC connection URI is a connection secret, not a seed phrase. Paste it only into this
          page. Do not send it through chat, a terminal command, an environment file, or a report.
        </p>
      </div>

      <section
        aria-labelledby="relays-heading"
        className="mt-6 rounded-lg border border-line bg-surface p-5"
      >
        <h2 id="relays-heading" className="text-lg font-semibold text-parchment">
          Approved relays
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The wallet&apos;s generated connection URI determines which relay is used. The academy
          currently accepts NWC connections using either:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-parchment">
          <li>
            <span className="font-semibold">Coinos relay:</span>{' '}
            <code className="break-all">{COINOS_RELAY}</code>
          </li>
          <li>
            <span className="font-semibold">Alby relay:</span>{' '}
            <code className="break-all">{ALBY_RELAY}</code>{' '}
            <span className="text-muted">(the /v1 path is required)</span>
          </li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-muted">
          Only these exact relay origins and paths are accepted. Other relay hosts, ports, paths,
          query strings, credentials, and fragments are rejected. Support is limited to these relays;
          this is not a claim that every NWC-compatible wallet is supported.
        </p>
      </section>

      <section
        aria-labelledby="setup-heading"
        className="mt-6 rounded-lg border border-line bg-surface p-5"
      >
        <h2 id="setup-heading" className="text-lg font-semibold text-parchment">
          Where to get an NWC connection
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Create the connection URI in your own Lightning wallet. Your wallet creates the
          credential. The relay is the message service named inside the URI; it is not the wallet
          provider. Use one of the two approved relays listed above.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <article className="rounded-lg border border-line bg-ink p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-parchment">Coinos</h3>
              <a
                href="https://coinos.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-amber hover:text-amber-soft"
              >
                Visit coinos.io
              </a>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Coinos is the wallet. Use its Nostr Wallet Connect or connected-apps settings to
              create a connection URI. Menu names can vary.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Approved relay
            </p>
            <code className="mt-1 block break-all rounded-md border border-line bg-surface-2 px-2 py-1.5 text-xs text-parchment">
              {COINOS_RELAY}
            </code>
            <p className="mt-3 text-xs leading-5 text-muted">
              Previously tested: this wallet/relay combination completed a successful live{' '}
              <code>get_info</code> connection.
            </p>
          </article>

          <article className="rounded-lg border border-line bg-ink p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-parchment">ZEUS</h3>
              <a
                href="https://zeusln.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-amber hover:text-amber-soft"
              >
                Visit zeusln.com
              </a>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              ZEUS is the wallet. Use its NWC connection setup to generate a connection URI. Menu
              names can vary.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Approved relay
            </p>
            <code className="mt-1 block break-all rounded-md border border-line bg-surface-2 px-2 py-1.5 text-xs text-parchment">
              {ALBY_RELAY}
            </code>
            <p className="mt-3 text-xs leading-5 text-muted">
              In this tested configuration, Alby is the relay service, not the wallet provider.
              Previously tested: this wallet/relay combination completed a successful live{' '}
              <code>get_info</code> connection.
            </p>
          </article>
        </div>

        <p className="mt-4 text-sm leading-6 text-muted">
          These are two tested examples, not a complete list of compatible wallets. Other wallets
          may be able to use these approved relays, but the Academy has not tested them. Support is
          not universal.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Create a fresh connection for KAOS Bitcoin Academy, use one of the approved relays, and
          paste the resulting URI into the field below. If your wallet lets you set a budget or
          permissions, use the smallest budget and limit the connection to <code>get_info</code>.
          When you are finished, disconnect here and revoke the connection in your wallet.
        </p>

        <div className="mt-4 rounded-md border border-amber/40 bg-amber/5 p-4 text-sm leading-6 text-muted">
          <p className="font-semibold text-amber">Before you connect</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Generate your own fresh NWC connection URI in your wallet.</li>
            <li>Select one of the Academy&apos;s two approved relays.</li>
            <li>
              Treat the URI as a sensitive credential. Never share it publicly or paste it into
              chats, screenshots, support requests, or reports.
            </li>
            <li>Never enter your wallet seed phrase or private key into the Academy.</li>
            <li>Wallet connection is optional; all educational content remains available.</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="connect-heading" className="mt-8 rounded-lg border border-line bg-surface p-5">
        <h2 id="connect-heading" className="text-lg font-semibold text-parchment">
          Connect your wallet
        </h2>
        <form onSubmit={onConnect} autoComplete="off" className="mt-4">
          <label htmlFor="nwc-uri" className="block text-sm font-semibold text-parchment">
            Fresh NWC connection URI
          </label>
          <input
            id="nwc-uri"
            name="nwc-connection-uri"
            type="password"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={busy}
            value={uri}
            onChange={(event) => setUri(event.target.value)}
            aria-describedby="nwc-uri-help"
            className="mt-2 w-full rounded-md border border-line bg-ink px-3 py-2.5 text-parchment placeholder:text-muted/60 disabled:opacity-60"
            placeholder="nostr+walletconnect://…"
          />
          <p id="nwc-uri-help" className="mt-2 text-xs leading-5 text-muted">
            Only the two approved relays listed above are accepted. The URI is kept in this
            page&apos;s memory only. It is not sent to the academy server, logged, or stored in
            browser storage.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft disabled:opacity-60"
            >
              {busy ? 'Connecting…' : 'Connect and request get_info'}
            </button>
            <button
              type="button"
              onClick={disconnect}
              className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment transition hover:border-amber"
            >
              Disconnect and clear
            </button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="status-heading"
        aria-live="polite"
        className={`mt-6 rounded-lg border p-4 ${statusClasses(status.kind)}`}
      >
        <h2 id="status-heading" className="text-sm font-semibold uppercase tracking-wide">
          Connection status
        </h2>
        <p className="mt-2 text-sm leading-6" role={status.kind === 'error' ? 'alert' : 'status'}>
          {status.message}
        </p>
      </section>

      {info ? <WalletInfo info={info} /> : null}

      <section aria-labelledby="safety-heading" className="mt-8 rounded-lg border border-line bg-surface p-5">
        <h2 id="safety-heading" className="text-lg font-semibold text-parchment">
          Disconnect, privacy, and limitations
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-6 text-muted">
          <p>
            Disconnecting closes the SDK client, clears the URI input, clears the client reference,
            removes the displayed wallet information, and prevents a delayed response from restoring
            stale state. The page also closes the connection when it is hidden or restored from the
            browser back-forward cache.
          </p>
          <p>
            Disconnecting from the academy does not necessarily revoke the connection inside your
            wallet provider. Revoke it from your wallet when you no longer need it.
          </p>
          <p>
            JavaScript strings cannot be guaranteed to be erased from memory. Disconnect and clear is
            best-effort cleanup, not physical memory zeroization. The SDK&apos;s <code>close()</code>{' '}
            closes relay connections but does not wipe its stored secret.
          </p>
          <p>
            A wallet&apos;s <code>mainnet</code> network value does not prove that it contains funds.
            A successful <code>get_info</code> response does not establish payment functionality or
            settlement.
          </p>
        </div>
      </section>

      <nav aria-label="Wallet navigation" className="mt-8 flex flex-wrap gap-3">
        <Link
          to={WALLET_ACTIVITY_LESSON.path}
          className="rounded-md border border-line px-4 py-2.5 text-sm text-parchment hover:border-amber"
        >
          ← Back to the lesson: {WALLET_ACTIVITY_LESSON.title}
        </Link>
        <Link
          to="/dashboard"
          className="rounded-md border border-line px-4 py-2.5 text-sm text-parchment hover:border-amber"
        >
          ← Back to dashboard
        </Link>
        <Link
          to="/courses"
          className="rounded-md border border-line px-4 py-2.5 text-sm text-parchment hover:border-amber"
        >
          Browse courses
        </Link>
      </nav>
    </div>
  )
}
