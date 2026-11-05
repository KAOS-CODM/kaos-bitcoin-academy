import { q, type QuizSeed } from '../types.js'

export const lightningNetworkQuizzes: QuizSeed[] = [
  {
    slug: 'ln-scaling-check',
    kind: 'lesson',
    courseSlug: '06-lightning-network',
    lessonSlug: 'ln-scaling',
    title: 'Check: the scaling problem',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'Why does the base layer settle relatively few transactions per second?',
        [
          'Block space is deliberately limited',
          'Bitcoin has no transaction format',
          'Only miners are allowed to send payments',
        ],
        0,
        'Limited block space is a deliberate trade-off that keeps storing and verifying the chain more accessible.',
      ),
      q(
        'q2',
        'What does Lightning change?',
        [
          'It removes the need for keys',
          'It moves most payments off-chain while the base layer remains the settlement layer',
          'It makes every payment a separate on-chain transaction',
        ],
        1,
        'Lightning enables fast off-chain payments, with on-chain settlement when channels close.',
      ),
    ],
  },
  {
    slug: 'ln-channels-check',
    kind: 'lesson',
    courseSlug: '06-lightning-network',
    lessonSlug: 'ln-channels',
    title: 'Check: channels, liquidity and invoices',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'What is inbound liquidity?',
        [
          'The amount of bitcoin you can mine',
          'The number of confirmations on a channel',
          'The ability to receive, meaning funds on the other side of your channels',
        ],
        2,
        'To receive, the other side of a channel must have balance available to send to you.',
      ),
      q(
        'q2',
        'An invoice expires before payment. What happened?',
        [
          'Nothing was sent; the request simply closed',
          'The payment was attempted and failed',
          'The recipient stole the funds',
        ],
        0,
        'An expired invoice is a closed request. It is different from an attempted payment that failed.',
      ),
    ],
  },
  {
    slug: 'lightning-network-assessment',
    kind: 'course',
    courseSlug: '06-lightning-network',
    title: 'Lightning Network assessment',
    passingScore: 80,
    questions: [
      q(
        'q1',
        'What is the trade-off behind limited Bitcoin block space?',
        [
          'Larger blocks have no storage or verification cost',
          'Smaller blocks limit throughput but verify cheaply',
          'Block space is unlimited, so transactions are slow',
        ],
        1,
        'The lesson explains that larger blocks are cheaper to fill but more expensive to store and verify.',
      ),
      q(
        'q2',
        'How is a Lightning channel opened?',
        [
          'By sending a seed phrase to a trusted relay',
          'By mining a new block for the channel',
          'An on-chain transaction funding the channel',
        ],
        2,
        'A channel is funded by an on-chain transaction; later payments update the channel off-chain.',
      ),
      q(
        'q3',
        'A new channel opened by you typically gives you which liquidity?',
        [
          'Outbound, but little inbound',
          'Only inbound liquidity',
          'No liquidity until the channel closes',
        ],
        0,
        'Funding a channel puts balance on your side, which supports sending but not necessarily receiving.',
      ),
      q(
        'q4',
        'Which is a key field of a Lightning invoice?',
        [
          'Private key, seed phrase and wallet password',
          'Amount, recipient, expiry and network marker',
          'Block height, miner signature and fee rate',
        ],
        1,
        'The lesson lists the amount, description or payment hash, recipient, expiry and network marker.',
      ),
      q(
        'q5',
        'Why is "expired" not the same as "failed"?',
        [
          'Expired means the money was stolen by someone',
          'Failed means the invoice is still open to pay',
          'Expired was never paid; failed was tried',
        ],
        2,
        'Expiry closes the request before payment; failure happens after an attempt.',
      ),
    ],
  },
]
