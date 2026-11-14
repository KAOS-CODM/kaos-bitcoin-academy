import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { PaymentPanel } from '../../client/src/features/wallet/PaymentPanel.tsx'
import { ReceivePanel } from '../../client/src/features/wallet/ReceivePanel.tsx'
import type {
  Nip47EnvelopeMethod,
  Nip47RequestResult,
} from '../../client/src/features/wallet/nwc-envelope.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const requireFromClient = createRequire(path.join(ROOT, 'client/package.json'))
const React = requireFromClient('react')
const { renderToStaticMarkup } = requireFromClient('react-dom/server')

;(globalThis as { React?: unknown }).React = React

/** A requester that records calls and returns a scripted result. */
function createRequester(result: Nip47RequestResult) {
  const calls: Array<{ method: Nip47EnvelopeMethod; params: unknown }> = []
  return {
    calls,
    async requestEnvelope(method: Nip47EnvelopeMethod, params: unknown) {
      calls.push({ method, params })
      return result
    },
  }
}

function renderPayment(props: {
  methods: string[]
  requester: PaymentPanelRequester | null
}): string {
  return renderToStaticMarkup(
    React.createElement(PaymentPanel, {
      methods: props.methods,
      requester: props.requester,
      maxAmountMsat: 100_000,
    }),
  )
}

type PaymentPanelRequester = ReturnType<typeof createRequester>

function renderReceive(props: {
  methods: string[]
  requester: PaymentPanelRequester | null
}): string {
  return renderToStaticMarkup(
    React.createElement(ReceivePanel, {
      methods: props.methods,
      requester: props.requester,
      defaultAmountSats: 21,
      maxAmountSats: 100,
      expirySeconds: 600,
    }),
  )
}

test('the payment panel explains that a wallet is required', () => {
  const html = renderPayment({ methods: [], requester: null })
  assert.match(html, /Connect a wallet above/)
  assert.equal(html.includes('Check invoice'), false)
})

test('the payment panel is unavailable when the wallet does not report pay_invoice', () => {
  const html = renderPayment({ methods: ['get_info', 'get_balance'], requester: createRequester({ status: 'failed', kind: 'stale' }) })
  assert.match(html, /does not report the/)
  assert.match(html, /pay_invoice/)
  assert.equal(html.includes('Check invoice'), false)
})

test('the payment panel offers inspection when the wallet reports pay_invoice', () => {
  const html = renderPayment({
    methods: ['get_info', 'pay_invoice'],
    requester: createRequester({ status: 'failed', kind: 'stale' }),
  })
  assert.match(html, /Check invoice/)
  assert.match(html, /never pays automatically/)
  assert.match(html, /never retries a payment/)
})

test('the payment panel never renders a success claim before a result exists', () => {
  const html = renderPayment({
    methods: ['get_info', 'pay_invoice'],
    requester: createRequester({ status: 'failed', kind: 'stale' }),
  })
  assert.equal(html.includes('Payment successful'), false)
  assert.equal(html.includes('Payment evidence verified'), false)
  assert.equal(html.includes('settled'), false)
})

test('the receive panel explains that a wallet is required', () => {
  const html = renderReceive({ methods: [], requester: null })
  assert.match(html, /Connect a wallet above/)
})

test('the receive panel is unavailable when the wallet does not report make_invoice', () => {
  const html = renderReceive({
    methods: ['get_info'],
    requester: createRequester({ status: 'failed', kind: 'stale' }),
  })
  assert.match(html, /does not report the/)
  assert.match(html, /make_invoice/)
})

test('the receive panel states that creating an invoice is not receiving money', () => {
  const html = renderReceive({
    methods: ['get_info', 'make_invoice'],
    requester: createRequester({ status: 'failed', kind: 'stale' }),
  })
  assert.match(html, /Creating an invoice is not receiving money/)
  assert.match(html, /Create invoice/)
  assert.match(html, /practice limit is 100 satoshis/)
})

test('the receive panel never renders a settled state before a result exists', () => {
  const html = renderReceive({
    methods: ['get_info', 'make_invoice'],
    requester: createRequester({ status: 'failed', kind: 'stale' }),
  })
  assert.equal(html.includes('reports the invoice settled'), false)
  assert.equal(html.includes('Payment successful'), false)
})
