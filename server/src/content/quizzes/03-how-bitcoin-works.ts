import { q, type QuizSeed } from '../types.js'

export const howBitcoinWorksQuizzes: QuizSeed[] = [
  {
    slug: 'how-ledger-check',
    kind: 'lesson',
    courseSlug: '03-how-bitcoin-works',
    lessonSlug: 'how-ledger',
    title: 'Check: a ledger everyone can check',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'What does each block contain?',
        [
          'Transactions and a reference to the previous block',
          'Only a list of private keys',
          'A company approval certificate',
        ],
        0,
        'A block contains transactions and a hash reference to the block before it.',
      ),
      q(
        'q2',
        'Why does changing an old block break the chain?',
        [
          'The miners automatically delete the block',
          'The block\'s hash changes, so later references no longer match',
          'The block becomes a private key',
        ],
        1,
        'A small change produces a different hash, and the next block still points to the old hash.',
      ),
    ],
  },
  {
    slug: 'how-transaction-check',
    kind: 'lesson',
    courseSlug: '03-how-bitcoin-works',
    lessonSlug: 'how-transaction',
    title: 'Check: what a transaction contains',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'How is the fee determined in a Bitcoin transaction?',
        [
          'It is a separate field sent to a company',
          'It is always exactly 1% of the amount',
          'It is the difference between total inputs and total outputs',
        ],
        2,
        'There is no separate fee field; the fee is the leftover value after outputs are assigned.',
      ),
      q(
        'q2',
        'What does a signature prove?',
        [
          'That the spender controls the key authorising the transaction',
          'That the spender knows the recipient personally',
          'That the transaction is already confirmed',
        ],
        0,
        'The signature proves control of the key behind the spent output. It is not a password sent to the network.',
      ),
    ],
  },
  {
    slug: 'how-bitcoin-works-assessment',
    kind: 'course',
    courseSlug: '03-how-bitcoin-works',
    title: 'How Bitcoin Works assessment',
    passingScore: 80,
    questions: [
      q(
        'q1',
        'A block\'s contents are edited after it was mined. What happens to its hash?',
        [
          'It stays exactly the same',
          'It changes completely',
          'It becomes a private key',
        ],
        1,
        'A hash is a fingerprint; changing the data changes the hash, which breaks the link from later blocks.',
      ),
      q(
        'q2',
        'What establishes the order of transactions in the ledger?',
        [
          'The order in which wallets were installed',
          'The size of each address',
          'The chain of blocks',
        ],
        2,
        'The chain gives a single agreed history and order that participants can verify.',
      ),
      q(
        'q3',
        'A transaction spends one 100,000-sat output and creates a 30,000-sat payment output. What is the output back to the sender usually called?',
        [
          'Change',
          'A signature',
          'A block reward',
        ],
        0,
        'The wallet creates a change output back to the sender, minus the fee.',
      ),
      q(
        'q4',
        'Who collects the transaction fee?',
        [
          'The recipient\'s wallet, which credits the payment',
          'The miner that includes it in a block',
          'A central Bitcoin company that routes payments',
        ],
        1,
        'Miners collect the leftover input value when they include the transaction in a block.',
      ),
      q(
        'q5',
        'Why is a signature not the same as a password?',
        [
          'It can be reused to spend every output',
          'It is sent to support agents for verification',
          'It is valid only for that transaction',
        ],
        2,
        'The wallet creates a transaction-specific signature; the private key is never sent to the network.',
      ),
    ],
  },
]
