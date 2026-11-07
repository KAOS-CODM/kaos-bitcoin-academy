import type {
  ConfirmationStage,
  DemoBlockTransaction,
  DemoUtxo,
  KeyVisibilityState,
  SimulationId,
  SimulationMeta,
  TransactionDraft,
} from './types'

export const SIMULATION_ONLY_LABEL = 'SIMULATION ONLY'

export const PLAYGROUND_SAFETY_POINTS = [
  'Every value in the playground is fictional demonstration data.',
  'No real private key, recovery phrase, wallet, or usable address is created.',
  'Nothing is signed, broadcast, mined, paid, or sent to a Bitcoin network.',
  'No QR codes, wallet connections, or external services are used.',
  'Nothing you type is sent to the server, collected, or saved.',
] as const

export const SIMULATION_BY_ID: Record<SimulationId, SimulationMeta> = {
  'wallet-creation': {
    id: 'wallet-creation',
    number: 1,
    title: 'Wallet Creation and Key Relationships',
    shortTitle: 'Wallet creation',
    objective:
      'Explain how a wallet manages keys and how an address is used to receive bitcoin.',
    description:
      'Reveal fictional labels to see the relationship between a private key, a public key, and an address.',
    instructions: [
      'Select “Show fictional wallet example” to reveal the demonstration.',
      'Read the three labels from left to right and notice which one is secret.',
      'Use “Reset demonstration” to return to the hidden starting state.',
    ],
  },
  'key-relationships': {
    id: 'key-relationships',
    number: 2,
    title: 'Public and Private Keys',
    shortTitle: 'Public and private keys',
    objective:
      'Distinguish information that can be shared from information that must remain secret.',
    description:
      'Use reveal and hide controls to compare fictional public and private values, and read what exposure would mean in a real wallet.',
    instructions: [
      'Use the reveal and hide buttons on each fictional value.',
      'Read the “Shareable” and “Secret” labels on every panel.',
      'Use the reset button to hide the private demonstration value again.',
    ],
  },
  'transaction-construction': {
    id: 'transaction-construction',
    number: 3,
    title: 'Transaction Construction',
    shortTitle: 'Transaction construction',
    objective:
      'Build a fictional transaction and see how inputs, outputs, change, and fees fit together.',
    description:
      'Choose a fictional input, enter an illustrative amount, select a fee, and review the arithmetic of a simulated transaction.',
    instructions: [
      'Choose one fictional input (UTXO).',
      'Enter a whole number of sats and choose an illustrative fee.',
      'Build the simulated transaction, then reset to try another combination.',
    ],
  },
  broadcasting: {
    id: 'broadcasting',
    number: 4,
    title: 'Broadcasting and Confirmation',
    shortTitle: 'Broadcasting and confirmation',
    objective:
      'Follow a fictional transaction from broadcast through network propagation, block inclusion, and confirmations.',
    description:
      'Advance an illustrative timeline to see why confirmations add confidence. Nothing is sent anywhere.',
    instructions: [
      'Read the current stage before advancing.',
      'Use “Advance simulated timeline” to move one stage at a time.',
      'Use “Reset timeline” to return to the prepared state.',
    ],
  },
  'block-formation': {
    id: 'block-formation',
    number: 5,
    title: 'Blockchain Block Formation',
    shortTitle: 'Block formation',
    objective:
      'See how transactions are grouped into a block and how a block header links to the previous block.',
    description:
      'Select fictional transactions, watch the demo block re-form, and compare its header fields with the previous block.',
    instructions: [
      'Select the fictional transactions you want in the demonstration block.',
      'Compare the previous-block hash, transaction digest, nonce, and block hash.',
      'Use “Reset to initial selection” to restore the first arrangement.',
    ],
  },
  mining: {
    id: 'mining',
    number: 6,
    title: 'Mining and Proof of Work',
    shortTitle: 'Mining and proof of work',
    objective:
      'Understand why miners repeat hashing work and how proof of work helps secure a blockchain.',
    description:
      'Start a lightweight demonstration that changes a nonce and checks a simplified target. No real block is mined.',
    instructions: [
      'Start the mining demonstration and watch the nonce attempts change.',
      'Notice that the demo hash must begin with the target prefix.',
      'Reset the demonstration to try again from nonce zero.',
    ],
  },
}

export const SIMULATIONS: readonly SimulationMeta[] = Object.values(SIMULATION_BY_ID)

export function isSimulationId(value: string | undefined): value is SimulationId {
  return value !== undefined && Object.prototype.hasOwnProperty.call(SIMULATION_BY_ID, value)
}

/**
 * These are deliberately non-hexadecimal, non-wallet values. They are labels
 * for the lesson, not credentials, and must never be replaced with real keys.
 */
export const DEMO_WALLET = {
  label: 'Fictional demo wallet',
  privateKey: 'DEMO-PRIVATE-KEY-NOT-A-REAL-SECRET-7F3A',
  publicKey: 'DEMO-PUBLIC-KEY-SHAREABLE-2C9B',
  address: 'kaos-demo-address-not-real-0001',
} as const

export const DEFAULT_KEY_VISIBILITY: KeyVisibilityState = {
  privateKeyVisible: false,
  publicKeyVisible: true,
  addressVisible: true,
}

export const DEMO_UTXOS: readonly DemoUtxo[] = [
  {
    id: 'demo-utxo-a',
    txid: 'demo-tx-a1b2c3',
    outputIndex: 0,
    amountSats: 150000,
    label: 'Fictional input A',
  },
  {
    id: 'demo-utxo-b',
    txid: 'demo-tx-d4e5f6',
    outputIndex: 1,
    amountSats: 80000,
    label: 'Fictional input B',
  },
]

export const DEMO_TRANSACTION = {
  sender: 'Fictional sender wallet',
  receiver: 'Fictional receiver wallet',
  id: 'DEMO-TX-NOT-REAL-0001',
} as const

export const FEE_OPTIONS = [
  { value: 500, label: '500 sats · small demonstration fee' },
  { value: 1000, label: '1,000 sats · medium demonstration fee' },
  { value: 2000, label: '2,000 sats · larger demonstration fee' },
] as const

export const DEFAULT_TRANSACTION_DRAFT: TransactionDraft = {
  utxoId: 'demo-utxo-a',
  amountText: '25000',
  feeSats: 1000,
}

export const CONFIRMATION_STAGES: readonly ConfirmationStage[] = [
  {
    id: 'prepared',
    title: 'Prepared locally (simulation)',
    detail:
      'The fictional transaction exists only as demonstration data in this page. A real wallet would still need to sign it.',
    confirmations: 0,
  },
  {
    id: 'broadcast',
    title: 'Broadcast to demo peers (simulation)',
    detail:
      'The demonstration imagines sending the transaction to a few fictional peers. No network message is created.',
    confirmations: 0,
  },
  {
    id: 'propagated',
    title: 'Propagated through the demo network (simulation)',
    detail:
      'The fictional peers pass the demonstration transaction along. Real nodes check rules before forwarding anything.',
    confirmations: 0,
  },
  {
    id: 'included',
    title: 'Included in a demo block (simulation)',
    detail:
      'The demonstration transaction appears in a fictional block. This is the first simulated confirmation.',
    confirmations: 1,
  },
  {
    id: 'confirmations-2',
    title: '2 simulated confirmations',
    detail:
      'Another fictional block is added on top. More blocks make rewriting the earlier record progressively harder.',
    confirmations: 2,
  },
  {
    id: 'confirmations-3',
    title: '3 simulated confirmations',
    detail:
      'The demonstration now shows three blocks. Confidence usually increases as confirmations accumulate.',
    confirmations: 3,
  },
  {
    id: 'confirmations-6',
    title: '6 simulated confirmations',
    detail:
      'The illustration reaches six confirmations. This is still a demonstration, not a real settlement or guarantee.',
    confirmations: 6,
  },
]

export const DEMO_BLOCK_TRANSACTIONS: readonly DemoBlockTransaction[] = [
  { id: 'demo-block-tx-1', label: 'Fictional transaction 1', amountSats: 12000 },
  { id: 'demo-block-tx-2', label: 'Fictional transaction 2', amountSats: 34000 },
  { id: 'demo-block-tx-3', label: 'Fictional transaction 3', amountSats: 7500 },
  { id: 'demo-block-tx-4', label: 'Fictional transaction 4', amountSats: 21000 },
  { id: 'demo-block-tx-5', label: 'Fictional transaction 5', amountSats: 56000 },
]

export const DEFAULT_BLOCK_SELECTION: readonly string[] = ['demo-block-tx-1', 'demo-block-tx-3']

export const DEMO_PREVIOUS_BLOCK = {
  label: 'Previous demo block',
  height: 0,
  hash: 'demo-previous-block-hash-0000',
} as const

export const DEMO_CURRENT_BLOCK = {
  label: 'Current demo block',
  height: 1,
  nonce: 0,
} as const

export const DEMO_MINING = {
  seed: 'kaos-demo-block-header-0001',
  targetPrefix: '000',
  maxAttempts: 50000,
  batchSize: 40,
  intervalMs: 24,
} as const
