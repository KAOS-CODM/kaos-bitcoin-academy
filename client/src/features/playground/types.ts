export type SimulationId =
  | 'wallet-creation'
  | 'key-relationships'
  | 'transaction-construction'
  | 'broadcasting'
  | 'block-formation'
  | 'mining'

export interface SimulationMeta {
  id: SimulationId
  number: number
  title: string
  shortTitle: string
  objective: string
  description: string
  instructions: readonly string[]
}

export interface DemoUtxo {
  id: string
  txid: string
  outputIndex: number
  amountSats: number
  label: string
}

export interface DemoBlockTransaction {
  id: string
  label: string
  amountSats: number
}

export interface TransactionInput {
  utxoAmountSats: number
  amountSats: number
  feeSats: number
}

export interface TransactionResult {
  valid: boolean
  errors: string[]
  inputTotalSats: number
  recipientOutputSats: number
  changeOutputSats: number
  feeSats: number
  totalOutputSats: number
  hasChange: boolean
}

export interface BlockResult {
  transactions: DemoBlockTransaction[]
  transactionCount: number
  totalSats: number
  transactionDigest: string
  previousHash: string
  blockHash: string
}

export interface MiningState {
  seed: string
  targetPrefix: string
  nonce: number
  attempts: number
  hash: string
  found: boolean
  running: boolean
  maxAttempts: number
}

export interface KeyVisibilityState {
  privateKeyVisible: boolean
  publicKeyVisible: boolean
  addressVisible: boolean
}

export interface TransactionDraft {
  utxoId: string
  amountText: string
  feeSats: number
}

export interface ConfirmationStage {
  id: string
  title: string
  detail: string
  confirmations: number
}

export type StageStatus = 'complete' | 'current' | 'upcoming'
