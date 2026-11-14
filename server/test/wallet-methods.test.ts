import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { describeWalletMethod } from '../../client/src/features/wallet/methods.ts'
import { sanitizeGetInfoResponse } from '../../client/src/features/wallet/nwc.ts'
import { WalletMethods } from '../../client/src/features/wallet/WalletMethods.tsx'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const requireFromClient = createRequire(path.join(ROOT, 'client/package.json'))
const React = requireFromClient('react')
const { renderToStaticMarkup } = requireFromClient('react-dom/server')

// tsx transpiles the imported client component with the classic JSX runtime in
// the server test runner. Expose the same React instance it should use.
;(globalThis as { React?: unknown }).React = React

function renderMethods(methods: string[]): string {
  return renderToStaticMarkup(React.createElement(WalletMethods, { methods }))
}

test('reported wallet methods have concise descriptions and unknown methods stay undescribed', () => {
  const expectedDescriptions: Record<string, string> = {
    get_balance: 'Requests wallet balance information.',
    lookup_invoice: 'Looks up information about an invoice.',
    list_transactions: 'Retrieves transaction history.',
    make_invoice: 'Creates a payment invoice.',
    pay_invoice: 'Requests payment of an invoice.',
    pay_keysend: 'Requests a keysend payment.',
    pay: 'Payment-related wallet operation.',
    receive: 'Wallet receive-related operation.',
    get_info: 'Retrieves wallet information.',
  }

  for (const [method, description] of Object.entries(expectedDescriptions)) {
    assert.equal(describeWalletMethod(method), description, method)
  }

  assert.equal(describeWalletMethod('unknown_method'), undefined)
  assert.equal(describeWalletMethod('GET_INFO'), undefined)
  assert.equal(describeWalletMethod('constructor'), undefined)
  assert.equal(describeWalletMethod('__proto__'), undefined)
})

test('the page distinguishes the method used from methods merely reported by the wallet', () => {
  const html = renderMethods(['get_balance', 'pay_invoice', 'custom_method'])

  assert.match(html, /Method used by the Academy/)
  assert.match(html, /Methods reported by the connected wallet/)
  assert.match(html, /<code[^>]*>get_info<\/code>/)
  assert.match(html, /Requests basic wallet information/)
  assert.match(html, /Requests wallet balance information\./)
  assert.match(html, /Requests payment of an invoice\./)
  assert.match(html, /custom_method/)
  assert.match(html, /These additional methods are capabilities reported by the connected wallet\./)
  assert.match(html, /The Academy has not verified that the wallet actually supports them\./)
  assert.match(html, /Displaying a method does not mean the Academy supports that operation\./)
  assert.match(
    html,
    /requests a balance or a transaction history only when you press\s+the matching button\./,
  )
  assert.match(html, /It never polls and never runs on its own\./)
  // The list itself may only contain methods the wallet actually reported. Prose elsewhere on
  // the page may name methods the wallet did not report.
  const reportedList = html.match(
    /<ul[^>]*aria-label="Methods reported by the connected wallet"[^>]*>[\s\S]*?<\/ul>/,
  )
  assert.ok(reportedList, 'the reported methods list should render')
  assert.equal(
    reportedList[0].includes('make_invoice'),
    false,
    'Only reported methods are listed',
  )
})

test('reported method names render safely and empty or missing lists are graceful', () => {
  const html = renderMethods(['<script>alert(1)</script>'])
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.equal(html.includes('<script>'), false)

  const emptyHtml = renderMethods([])
  assert.match(emptyHtml, /The wallet did not report any methods\./)
  assert.match(emptyHtml, /Method used by the Academy/)

  assert.deepEqual(sanitizeGetInfoResponse({ alias: 'No methods' }), {
    alias: 'No methods',
    methods: [],
  })
  assert.deepEqual(sanitizeGetInfoResponse({ methods: null }).methods, [])
  assert.deepEqual(sanitizeGetInfoResponse({ methods: [] }).methods, [])
})
