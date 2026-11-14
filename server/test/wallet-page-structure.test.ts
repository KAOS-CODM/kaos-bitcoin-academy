import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { PaymentPanel } from '../../client/src/features/wallet/PaymentPanel.tsx'
import { ReceivePanel } from '../../client/src/features/wallet/ReceivePanel.tsx'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const requireFromClient = createRequire(path.join(ROOT, 'client/package.json'))
const React = requireFromClient('react')
const { renderToStaticMarkup } = requireFromClient('react-dom/server')

// tsx transpiles the imported client components with the classic JSX runtime in the server
// test runner. Expose the same React instance it should use.
;(globalThis as { React?: unknown }).React = React

/**
 * The wallet page renders react-router <Link> elements, so it needs a router context.
 * The page's own modules resolve 'react-router-dom' to the client's ESM build; importing
 * that exact file keeps both on the same module instance and the same context.
 */
const CLIENT_ROUTER_ESM = path.join(
  ROOT,
  'client/node_modules/react-router-dom/dist/index.mjs',
)

const PAYMENT_HEADING = 'Pay a Lightning invoice'
const RECEIVE_HEADING = 'Create a practice receive invoice'

interface KeyedSibling {
  parent: string
  key: string
}

function elementName(type: unknown): string {
  if (typeof type === 'function') {
    return (type as { name?: string }).name || 'Anonymous'
  }
  if (typeof type === 'string') return type
  return 'Unknown'
}

/**
 * Render the wallet page and report every duplicated key found among siblings.
 *
 * React requires keys to be unique among siblings; the installed React build documents
 * that non-unique keys "may cause children to be duplicated and/or omitted". This walks the
 * element tree the same way the reconciler does, without needing a DOM.
 */
async function renderWalletPageCollectingKeyViolations(): Promise<{
  html: string
  violations: string[]
}> {
  const { MemoryRouter } = (await import(CLIENT_ROUTER_ESM)) as {
    MemoryRouter: (props: { initialEntries: string[]; children?: unknown }) => unknown
  }
  const { Wallet } = (await import('../../client/src/pages/Wallet.tsx')) as {
    Wallet: () => unknown
  }

  const violations: string[] = []
  const originalCreateElement = (
    React as unknown as {
      createElement: (
        type: unknown,
        props: Record<string, unknown> | null,
        ...children: unknown[]
      ) => unknown
    }
  ).createElement

  ;(
    React as unknown as {
      createElement: (
        type: unknown,
        props: Record<string, unknown> | null,
        ...children: unknown[]
      ) => unknown
    }
  ).createElement = (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => {
    const element = originalCreateElement(type, props, ...children) as {
      props?: { children?: unknown }
    }

    const kids = element.props?.children
    const siblings = Array.isArray(kids) ? kids : kids === undefined || kids === null ? [] : [kids]
    const seen = new Map<string, number>()

    for (const sibling of siblings) {
      const candidate = sibling as { key?: unknown } | null
      if (!candidate || typeof candidate !== 'object') continue
      // React uses a null key for elements created without one; only explicitly keyed
      // siblings participate in the uniqueness rule.
      if (candidate.key === undefined || candidate.key === null) continue
      const key = String(candidate.key)
      const count = (seen.get(key) ?? 0) + 1
      seen.set(key, count)
      if (count > 1) {
        violations.push(`${elementName(type)}: duplicate sibling key "${key}"`)
      }
    }

    return element
  }

  try {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter as never,
        { initialEntries: ['/wallet'] } as never,
        React.createElement(Wallet as never),
      ),
    )
    return { html, violations }
  } finally {
    ;(
      React as unknown as {
        createElement: (
          type: unknown,
          props: Record<string, unknown> | null,
          ...children: unknown[]
        ) => unknown
      }
    ).createElement = originalCreateElement
  }
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

function headingsInOrder(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, '')
      .trim(),
  )
}

test('the wallet page gives every keyed sibling a unique key', async () => {
  const { violations } = await renderWalletPageCollectingKeyViolations()

  assert.deepEqual(
    violations,
    [],
    'sibling keys must be unique; duplicated keys let React duplicate or omit children',
  )
})

test('the wallet page renders the payment section exactly once', async () => {
  const { html } = await renderWalletPageCollectingKeyViolations()

  assert.equal(
    countOf(html, PAYMENT_HEADING),
    1,
    'the "Pay a Lightning invoice" section must appear exactly once',
  )
  assert.equal(countOf(html, 'aria-labelledby="send-heading"'), 1)
})

test('the wallet page renders the receive section exactly once', async () => {
  const { html } = await renderWalletPageCollectingKeyViolations()

  assert.equal(
    countOf(html, RECEIVE_HEADING),
    1,
    'the "Create a practice receive invoice" section must appear exactly once',
  )
  assert.equal(countOf(html, 'aria-labelledby="receive-heading"'), 1)
})

test('the wallet page keeps the expected section order', async () => {
  const { html } = await renderWalletPageCollectingKeyViolations()
  const headings = headingsInOrder(html)

  const expected = [
    'Connect your wallet',
    'Connection status',
    'Wallet account dashboard',
    PAYMENT_HEADING,
    RECEIVE_HEADING,
    'Disconnect, privacy, and limitations',
  ]

  let cursor = -1
  for (const heading of expected) {
    const index = headings.indexOf(heading, cursor + 1)
    assert.notEqual(index, -1, `missing section heading: ${heading}`)
    assert.ok(index > cursor, `section out of order: ${heading}`)
    cursor = index
  }
})

test('the payment section is rendered once regardless of the reported wallet methods', () => {
  const requester = {
    async requestEnvelope() {
      return { status: 'failed' as const, kind: 'stale' as const }
    },
  }

  const capabilitySets = [
    ['get_info'],
    ['get_info', 'pay_invoice'],
    ['get_info', 'pay_invoice', 'make_invoice', 'lookup_invoice'],
  ]

  for (const methods of capabilitySets) {
    const html = renderToStaticMarkup(
      React.createElement(PaymentPanel as never, {
        methods,
        requester,
        maxAmountMsat: 100_000,
      } as never),
    )

    assert.equal(
      countOf(html, PAYMENT_HEADING),
      1,
      `payment section must render once for methods ${methods.join(',')}`,
    )
    assert.equal(countOf(html, '<section'), 1)
  }
})

test('the receive section is rendered once regardless of the reported wallet methods', () => {
  const requester = {
    async requestEnvelope() {
      return { status: 'failed' as const, kind: 'stale' as const }
    },
  }

  const capabilitySets = [
    ['get_info'],
    ['get_info', 'make_invoice'],
    ['get_info', 'pay_invoice', 'make_invoice', 'lookup_invoice'],
  ]

  for (const methods of capabilitySets) {
    const html = renderToStaticMarkup(
      React.createElement(ReceivePanel as never, {
        methods,
        requester,
        defaultAmountSats: 21,
        maxAmountSats: 100,
        expirySeconds: 600,
      } as never),
    )

    assert.equal(
      countOf(html, RECEIVE_HEADING),
      1,
      `receive section must render once for methods ${methods.join(',')}`,
    )
    assert.equal(countOf(html, '<section'), 1)
  }
})

test('an unavailable method is explained without removing the section', () => {
  const html = renderToStaticMarkup(
    React.createElement(PaymentPanel as never, {
      methods: ['get_info'],
      requester: {
        async requestEnvelope() {
          return { status: 'failed' as const, kind: 'stale' as const }
        },
      },
      maxAmountMsat: 100_000,
    } as never),
  )

  assert.equal(countOf(html, PAYMENT_HEADING), 1)
  assert.match(html, /does not report the/)
})
