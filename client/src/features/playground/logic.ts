import type {
  BlockResult,
  DemoBlockTransaction,
  MiningState,
  StageStatus,
  TransactionInput,
  TransactionResult,
} from './types'

/**
 * A tiny deterministic teaching hash. It is not SHA-256, is not used for
 * security, and must not be presented as a Bitcoin hash implementation.
 */
export function demoHash(input: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Longer illustrative digest; still deliberately prefixed with "demo-". */
export function demoHashLong(input: string, blocks = 4): string {
  const parts: string[] = []
  for (let index = 0; index < blocks; index += 1) {
    parts.push(demoHash(`${index}:${input}`))
  }
  return parts.join('')
}

export function parseSatsInput(value: string): number {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return Number.NaN
  return Number.parseInt(trimmed, 10)
}

/**
 * Calculates the displayed transaction breakdown. This is arithmetic for the
 * lesson only; it never signs, serialises, broadcasts, or pays anything.
 */
export function calculateTransaction(input: TransactionInput): TransactionResult {
  const errors: string[] = []
  const { utxoAmountSats, amountSats, feeSats } = input

  if (!Number.isSafeInteger(utxoAmountSats) || utxoAmountSats <= 0) {
    errors.push('Choose a fictional input with a positive amount.')
  }
  if (!Number.isSafeInteger(amountSats) || amountSats <= 0) {
    errors.push('Enter a whole number of sats greater than zero.')
  }
  if (!Number.isSafeInteger(feeSats) || feeSats < 0) {
    errors.push('Choose a non-negative whole-number fee.')
  }

  const change = utxoAmountSats - amountSats - feeSats
  if (!Number.isSafeInteger(change)) {
    errors.push('The demonstration amount is too large.')
  } else if (change < 0) {
    errors.push('The amount plus the fee is larger than the selected fictional input.')
  }

  const recipientOutputSats =
    Number.isSafeInteger(amountSats) && amountSats > 0 ? amountSats : 0
  const safeFeeSats = Number.isSafeInteger(feeSats) && feeSats >= 0 ? feeSats : 0
  const changeOutputSats = Number.isSafeInteger(change) && change > 0 ? change : 0

  return {
    valid: errors.length === 0,
    errors,
    inputTotalSats: Number.isSafeInteger(utxoAmountSats) ? utxoAmountSats : 0,
    recipientOutputSats,
    changeOutputSats,
    feeSats: safeFeeSats,
    totalOutputSats: recipientOutputSats + changeOutputSats,
    hasChange: changeOutputSats > 0,
  }
}

/**
 * Builds a deterministic, clearly labelled demo block from fictional
 * transactions. The digests are teaching aids, not real Merkle roots.
 */
export function buildBlock(
  transactions: readonly DemoBlockTransaction[],
  selectedIds: readonly string[],
  previousHash: string,
): BlockResult {
  const selected = transactions.filter((transaction) => selectedIds.includes(transaction.id))
  const transactionData = selected
    .map((transaction) => `${transaction.id}:${transaction.amountSats}`)
    .join('|')
  const transactionDigest = `demo-${demoHashLong(transactionData || 'empty-block')}`
  const blockHash = `demo-${demoHashLong(`${previousHash}|${transactionDigest}|nonce:0`)}`

  return {
    transactions: selected,
    transactionCount: selected.length,
    totalSats: selected.reduce((total, transaction) => total + transaction.amountSats, 0),
    transactionDigest,
    previousHash,
    blockHash,
  }
}

export function createMiningState(
  seed: string,
  targetPrefix: string,
  maxAttempts: number,
): MiningState {
  const hash = demoHash(`${seed}:0`)
  return {
    seed,
    targetPrefix,
    nonce: 0,
    attempts: 0,
    hash,
    found: hash.startsWith(targetPrefix),
    running: false,
    maxAttempts,
  }
}

/** Advances a bounded number of hashes so the UI stays responsive on mobile. */
export function advanceMining(state: MiningState, batchSize: number): MiningState {
  if (!state.running || state.found || state.attempts >= state.maxAttempts) {
    return { ...state, running: false }
  }

  let nonce = state.nonce
  let attempts = state.attempts
  let hash = state.hash
  let found: boolean = state.found
  const limit = Math.max(1, Math.floor(batchSize))

  for (let index = 0; index < limit && attempts < state.maxAttempts; index += 1) {
    nonce += 1
    attempts += 1
    hash = demoHash(`${state.seed}:${nonce}`)
    if (hash.startsWith(state.targetPrefix)) {
      found = true
      break
    }
  }

  return {
    ...state,
    nonce,
    attempts,
    hash,
    found,
    running: !found && attempts < state.maxAttempts,
  }
}

/** Synchronous helper used by tests and by deterministic lesson examples. */
export function findMiningSolution(
  seed: string,
  targetPrefix: string,
  maxAttempts: number,
): MiningState {
  let state = createMiningState(seed, targetPrefix, maxAttempts)
  state = {
    ...state,
    running: !state.found && state.attempts < state.maxAttempts,
  }

  while (state.running) {
    state = advanceMining(state, 1000)
  }

  return state
}

export function stageStatus(index: number, currentIndex: number): StageStatus {
  if (index < currentIndex) return 'complete'
  if (index === currentIndex) return 'current'
  return 'upcoming'
}

export function formatSats(value: number): string {
  return `${value.toLocaleString('en-US')} sats`
}
