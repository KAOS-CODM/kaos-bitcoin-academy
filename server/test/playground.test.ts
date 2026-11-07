import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  DEFAULT_BLOCK_SELECTION,
  DEFAULT_KEY_VISIBILITY,
  DEFAULT_TRANSACTION_DRAFT,
  DEMO_BLOCK_TRANSACTIONS,
  DEMO_MINING,
  DEMO_PREVIOUS_BLOCK,
  DEMO_WALLET,
  PLAYGROUND_SAFETY_POINTS,
  SIMULATION_ONLY_LABEL,
  SIMULATIONS,
} from '../../client/src/features/playground/data.ts'
import {
  advanceMining,
  buildBlock,
  calculateTransaction,
  createMiningState,
  demoHash,
  findMiningSolution,
  parseSatsInput,
  stageStatus,
} from '../../client/src/features/playground/logic.ts'
import { WalletCreationSimulation } from '../../client/src/features/playground/simulations/WalletCreationSimulation.tsx'
import { KeyRelationshipsSimulation } from '../../client/src/features/playground/simulations/KeyRelationshipsSimulation.tsx'
import { TransactionConstructionSimulation } from '../../client/src/features/playground/simulations/TransactionConstructionSimulation.tsx'
import { BroadcastingSimulation } from '../../client/src/features/playground/simulations/BroadcastingSimulation.tsx'
import { BlockFormationSimulation } from '../../client/src/features/playground/simulations/BlockFormationSimulation.tsx'
import { MiningSimulation } from '../../client/src/features/playground/simulations/MiningSimulation.tsx'
import { Playground } from '../../client/src/pages/Playground.tsx'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PLAYGROUND_DIR = path.join(ROOT, 'client/src/features/playground')
const PLAYGROUND_PAGES = [
  path.join(ROOT, 'client/src/pages/Playground.tsx'),
  path.join(ROOT, 'client/src/pages/PlaygroundSimulation.tsx'),
]

// React is installed for the client workspace. Resolving from the client package
// keeps the existing server test runner usable without adding a test dependency.
const requireFromClient = createRequire(path.join(ROOT, 'client/package.json'))
const React = requireFromClient('react')
const { renderToStaticMarkup } = requireFromClient('react-dom/server')
const { MemoryRouter } = await import(
  pathToFileURL(
    path.join(ROOT, 'client/node_modules/react-router-dom/dist/index.mjs'),
  ).href
)

// tsx transpiles the imported client components with the classic JSX runtime in
// the server test runner. Expose the same React instance they should use.
;(globalThis as { React?: unknown }).React = React

const COMPONENTS = [
  ['wallet-creation', WalletCreationSimulation],
  ['key-relationships', KeyRelationshipsSimulation],
  ['transaction-construction', TransactionConstructionSimulation],
  ['broadcasting', BroadcastingSimulation],
  ['block-formation', BlockFormationSimulation],
  ['mining', MiningSimulation],
] as const

const EXPECTED_CONTENT: Record<string, string[]> = {
  'wallet-creation': [
    'A wallet manages keys',
    'An address receives bitcoin',
    'The demonstration values are hidden',
    'What this demonstration does not do',
  ],
  'key-relationships': [
    'Must remain secret',
    'If a real private key is exposed',
    'Reveal private key demo value',
    'Hide public key demo value',
  ],
  'transaction-construction': [
    'Choose a fictional input (UTXO)',
    'Build simulated transaction',
    'How UTXOs and outputs work',
    'Illustrative fee',
  ],
  broadcasting: [
    'Advance simulated timeline',
    'Simulated confirmations',
    'No transaction is sent to the Bitcoin network',
    'Broadcast and propagation',
  ],
  'block-formation': [
    'The demo chain',
    'Previous block hash',
    'Transaction digest (illustrative)',
    'Reset to initial selection',
    'What the block header contains',
  ],
  mining: [
    'Start mining demonstration',
    'Nonce attempts',
    'Demo hash must begin with 000',
    'Why miners repeat work',
    'No real block is mined',
  ],
}

function renderWithRouter(element: unknown): string {
  return renderToStaticMarkup(React.createElement(MemoryRouter, null, element))
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath]
  })
}

test('the playground declares exactly six ordered simulations', () => {
  assert.deepEqual(
    SIMULATIONS.map((simulation) => simulation.id),
    COMPONENTS.map(([id]) => id),
  )
  assert.deepEqual(
    SIMULATIONS.map((simulation) => simulation.number),
    [1, 2, 3, 4, 5, 6],
  )
  assert.equal(new Set(SIMULATIONS.map((simulation) => simulation.id)).size, 6)

  for (const simulation of SIMULATIONS) {
    assert.ok(simulation.title.length > 10, simulation.id)
    assert.ok(simulation.objective.length > 30, simulation.id)
    assert.ok(simulation.instructions.length >= 2, simulation.id)
  }
})

test('the safety policy is stated in the shared playground data', () => {
  assert.equal(SIMULATION_ONLY_LABEL, 'SIMULATION ONLY')
  assert.ok(PLAYGROUND_SAFETY_POINTS.some((point) => point.includes('fictional')))
  assert.ok(PLAYGROUND_SAFETY_POINTS.some((point) => point.includes('No real private key')))
  assert.ok(PLAYGROUND_SAFETY_POINTS.some((point) => point.includes('Bitcoin network')))
  assert.ok(PLAYGROUND_SAFETY_POINTS.some((point) => point.includes('No QR codes')))
})

test('all six simulations render with their required educational content', () => {
  for (const [id, Component] of COMPONENTS) {
    const html = renderWithRouter(React.createElement(Component))
    const simulation = SIMULATIONS.find((item) => item.id === id)
    assert.ok(simulation, id)
    assert.ok(html.length > 1000, id)
    assert.match(html, new RegExp(SIMULATION_ONLY_LABEL), id)
    assert.ok(html.includes(simulation.title), id)
    assert.ok(html.includes(simulation.objective), id)
    for (const phrase of EXPECTED_CONTENT[id]) {
      assert.ok(html.includes(phrase), `${id} should render: ${phrase}`)
    }
  }
})

test('the playground landing page introduces all six simulations and safety rules', () => {
  const html = renderWithRouter(React.createElement(Playground))
  assert.ok(html.includes('Bitcoin Playground'))
  assert.ok(html.includes('Choose a simulation'))
  assert.ok(html.includes('Safety rules for this playground'))
  for (const simulation of SIMULATIONS) {
    assert.ok(html.includes(simulation.title), simulation.id)
  }
})

test('interactive controls are present with accessible labels', () => {
  const wallet = renderWithRouter(React.createElement(WalletCreationSimulation))
  assert.ok(wallet.includes('Show fictional wallet example'))
  assert.ok(wallet.includes('Reset demonstration'))
  assert.ok(wallet.includes('aria-disabled="true"') === false)

  const keys = renderWithRouter(React.createElement(KeyRelationshipsSimulation))
  assert.ok(keys.includes('aria-pressed="false"'))
  assert.ok(keys.includes('aria-pressed="true"'))
  assert.ok(keys.includes('Reset visibility'))

  const transaction = renderWithRouter(React.createElement(TransactionConstructionSimulation))
  assert.ok(transaction.includes('<form'))
  assert.ok(transaction.includes('for="transaction-amount"'))
  assert.ok(transaction.includes('for="transaction-fee"'))
  assert.ok(transaction.includes('type="radio"'))

  const broadcasting = renderWithRouter(React.createElement(BroadcastingSimulation))
  assert.ok(broadcasting.includes('Advance simulated timeline'))
  assert.ok(broadcasting.includes('Reset timeline'))
  assert.ok(broadcasting.includes('aria-live="polite"'))

  const block = renderWithRouter(React.createElement(BlockFormationSimulation))
  assert.ok(block.includes('type="checkbox"'))
  assert.ok(block.includes('Add all demo transactions'))
  assert.ok(block.includes('Reset to initial selection'))

  const mining = renderWithRouter(React.createElement(MiningSimulation))
  assert.ok(mining.includes('Start mining demonstration'))
  assert.ok(mining.includes('Pause'))
  assert.ok(mining.includes('Reset demonstration'))
  assert.ok(mining.includes('<progress'))
})

test('the demonstration wallet values cannot be valid Bitcoin credentials', () => {
  const hex64 = /^[0-9a-f]{64}$/i
  assert.equal(hex64.test(DEMO_WALLET.privateKey), false)
  assert.equal(hex64.test(DEMO_WALLET.publicKey), false)
  assert.equal(/^(bc1|[13])[a-z0-9]{20,}$/i.test(DEMO_WALLET.address), false)
  assert.ok(DEMO_WALLET.privateKey.includes('DEMO'))
  assert.ok(DEMO_WALLET.privateKey.includes('NOT-A-REAL'))
  assert.ok(DEMO_WALLET.address.includes('not-real'))
  assert.equal(Object.prototype.hasOwnProperty.call(DEMO_WALLET, 'mnemonic'), false)
  assert.equal(DEMO_WALLET.privateKey.trim().split(/\s+/).length, 1)
})

test('transaction arithmetic is correct for valid, exact, and invalid inputs', () => {
  const normal = calculateTransaction({
    utxoAmountSats: 150000,
    amountSats: 25000,
    feeSats: 1000,
  })
  assert.equal(normal.valid, true)
  assert.equal(normal.inputTotalSats, 150000)
  assert.equal(normal.recipientOutputSats, 25000)
  assert.equal(normal.changeOutputSats, 124000)
  assert.equal(normal.totalOutputSats, 149000)
  assert.equal(normal.feeSats, 1000)
  assert.equal(normal.inputTotalSats, normal.totalOutputSats + normal.feeSats)

  const exact = calculateTransaction({
    utxoAmountSats: 150000,
    amountSats: 149000,
    feeSats: 1000,
  })
  assert.equal(exact.valid, true)
  assert.equal(exact.changeOutputSats, 0)
  assert.equal(exact.hasChange, false)
  assert.equal(exact.totalOutputSats, 149000)

  const overSpend = calculateTransaction({
    utxoAmountSats: 150000,
    amountSats: 149500,
    feeSats: 1000,
  })
  assert.equal(overSpend.valid, false)
  assert.ok(overSpend.errors.some((error) => error.includes('larger than')))

  const zeroAmount = calculateTransaction({
    utxoAmountSats: 150000,
    amountSats: 0,
    feeSats: 1000,
  })
  assert.equal(zeroAmount.valid, false)
  assert.ok(zeroAmount.errors.some((error) => error.includes('greater than zero')))

  assert.equal(parseSatsInput('25000'), 25000)
  assert.ok(Number.isNaN(parseSatsInput('')))
  assert.ok(Number.isNaN(parseSatsInput('2.5')))
})

test('the default transaction draft remains valid and reset-ready', () => {
  const result = calculateTransaction({
    utxoAmountSats: 150000,
    amountSats: parseSatsInput(DEFAULT_TRANSACTION_DRAFT.amountText),
    feeSats: DEFAULT_TRANSACTION_DRAFT.feeSats,
  })
  assert.equal(DEFAULT_TRANSACTION_DRAFT.utxoId, 'demo-utxo-a')
  assert.equal(DEFAULT_TRANSACTION_DRAFT.amountText, '25000')
  assert.equal(DEFAULT_TRANSACTION_DRAFT.feeSats, 1000)
  assert.equal(result.valid, true)
})

test('block construction is deterministic and changes with its transaction data', () => {
  const block = buildBlock(DEMO_BLOCK_TRANSACTIONS, DEFAULT_BLOCK_SELECTION, DEMO_PREVIOUS_BLOCK.hash)
  assert.equal(block.transactionCount, 2)
  assert.equal(block.totalSats, 19500)
  assert.ok(block.transactionDigest.startsWith('demo-'))
  assert.ok(block.blockHash.startsWith('demo-'))
  assert.equal(block.previousHash, DEMO_PREVIOUS_BLOCK.hash)

  const repeat = buildBlock(DEMO_BLOCK_TRANSACTIONS, DEFAULT_BLOCK_SELECTION, DEMO_PREVIOUS_BLOCK.hash)
  assert.deepEqual(repeat, block)

  const changed = buildBlock(
    DEMO_BLOCK_TRANSACTIONS,
    ['demo-block-tx-1', 'demo-block-tx-2'],
    DEMO_PREVIOUS_BLOCK.hash,
  )
  assert.notEqual(changed.blockHash, block.blockHash)
  assert.notEqual(changed.transactionDigest, block.transactionDigest)
  assert.equal(changed.totalSats, 46000)

  const empty = buildBlock(DEMO_BLOCK_TRANSACTIONS, [], DEMO_PREVIOUS_BLOCK.hash)
  assert.equal(empty.transactionCount, 0)
  assert.equal(empty.totalSats, 0)
  assert.ok(empty.blockHash.startsWith('demo-'))
})

test('mining stops only on a hash that satisfies the simplified target', () => {
  const solution = findMiningSolution(
    DEMO_MINING.seed,
    DEMO_MINING.targetPrefix,
    DEMO_MINING.maxAttempts,
  )
  assert.equal(solution.found, true)
  assert.equal(solution.running, false)
  assert.ok(solution.attempts > 0)
  assert.ok(solution.attempts <= DEMO_MINING.maxAttempts)
  assert.ok(solution.hash.startsWith(DEMO_MINING.targetPrefix))
  assert.equal(solution.hash, demoHash(`${DEMO_MINING.seed}:${solution.nonce}`))

  const impossibleTarget = findMiningSolution(DEMO_MINING.seed, 'zzzzzzzz', 250)
  assert.equal(impossibleTarget.found, false)
  assert.equal(impossibleTarget.attempts, 250)
  assert.equal(impossibleTarget.running, false)
})

test('mining state can be reset to the same starting values', () => {
  const first = createMiningState(DEMO_MINING.seed, DEMO_MINING.targetPrefix, DEMO_MINING.maxAttempts)
  const second = createMiningState(DEMO_MINING.seed, DEMO_MINING.targetPrefix, DEMO_MINING.maxAttempts)
  assert.deepEqual(first, second)
  assert.equal(first.attempts, 0)
  assert.equal(first.nonce, 0)
  assert.equal(first.running, false)
  assert.equal(first.found, false)

  const advanced = advanceMining({ ...first, running: true }, 5)
  assert.equal(advanced.attempts, 5)
  assert.equal(advanced.nonce, 5)
  assert.equal(advanced.running, true)
})

test('timeline stages report complete, current, and upcoming states', () => {
  assert.equal(stageStatus(0, 0), 'current')
  assert.equal(stageStatus(0, 1), 'complete')
  assert.equal(stageStatus(1, 0), 'upcoming')
  assert.equal(stageStatus(2, 2), 'current')
})

test('visibility defaults hide the private value and keep shareable values visible', () => {
  assert.deepEqual(DEFAULT_KEY_VISIBILITY, {
    privateKeyVisible: false,
    publicKeyVisible: true,
    addressVisible: true,
  })
})

test('playground source contains no network, wallet, storage, or key-generation calls', () => {
  const sourceFiles = [...listFiles(PLAYGROUND_DIR), ...PLAYGROUND_PAGES].filter((file) =>
    /\.(ts|tsx)$/.test(file),
  )
  const forbidden = [
    'fetch(',
    'XMLHttpRequest',
    'WebSocket',
    'axios',
    'http://',
    'https://',
    'bitcoin:',
    'walletconnect',
    'lnbits',
    'qrcode',
    'navigator.',
    'localStorage',
    'sessionStorage',
    'crypto.',
    'randomBytes',
    'generateMnemonic',
  ]

  assert.ok(sourceFiles.length >= 15)
  for (const file of sourceFiles) {
    const source = readFileSync(file, 'utf8')
    for (const token of forbidden) {
      assert.equal(source.includes(token), false, `${path.basename(file)} must not contain ${token}`)
    }
  }
})
