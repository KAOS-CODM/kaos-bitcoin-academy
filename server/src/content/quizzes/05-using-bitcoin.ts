import { q, type QuizSeed } from '../types.js'

export const usingBitcoinQuizzes: QuizSeed[] = [
  {
    slug: 'using-receive-check',
    kind: 'lesson',
    courseSlug: '05-using-bitcoin',
    lessonSlug: 'using-receive',
    title: 'Check: receiving and confirmations',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'What is a confirmation?',
        [
          'A block added after the block containing your transaction',
          'A message from the sender approving the payment',
          'A password set on the receiving address',
        ],
        0,
        'Each later block adds another confirmation, increasing confidence that the transaction is settled.',
      ),
      q(
        'q2',
        'Why should a valuable sale wait for confirmations?',
        [
          'Confirmations make the bitcoin worth more',
          'An unconfirmed transaction could be replaced before it settles',
          'The buyer cannot see an unconfirmed payment',
        ],
        1,
        'Waiting makes it much harder for the buyer to replace the payment with one paying themselves.',
      ),
    ],
  },
  {
    slug: 'using-fees-check',
    kind: 'lesson',
    courseSlug: '05-using-bitcoin',
    lessonSlug: 'using-fees',
    title: 'Check: fees and confirmation times',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'What determines which transactions miners include first?',
        [
          'The age of the sender\'s wallet',
          'The number of addresses in the wallet',
          'The fee paid per unit of block space',
        ],
        2,
        'When block space is scarce, miners prefer transactions that pay the most per unit of space.',
      ),
      q(
        'q2',
        'What can happen when a fee is too low?',
        [
          'The transaction may wait hours or days in the mempool',
          'The transaction is immediately deleted',
          'The sender automatically loses all bitcoin',
        ],
        0,
        'A low-fee transaction can remain unconfirmed until the network clears or the fee is increased.',
      ),
    ],
  },
  {
    slug: 'using-bitcoin-assessment',
    kind: 'course',
    courseSlug: '05-using-bitcoin',
    title: 'Using Bitcoin assessment',
    passingScore: 80,
    questions: [
      q(
        'q1',
        'Where do valid transactions wait before being included in a block?',
        [
          'The seed phrase',
          'The mempool',
          'The 21 million limit',
        ],
        1,
        'The mempool is the waiting area for valid transactions that are not yet mined.',
      ),
      q(
        'q2',
        'A payment has one confirmation. What does that mean?',
        [
          'The sender has signed a legal contract',
          'The payment can never be reversed',
          'One block added after its block',
        ],
        2,
        'A confirmation is one block added after the transaction\'s block; more blocks increase confidence.',
      ),
      q(
        'q3',
        'Why should you check the first and last characters of an address?',
        [
          'A typo can make funds unrecoverable',
          'It increases the block reward for the sender',
          'It automatically lowers the transaction fee',
        ],
        0,
        'Address mistakes are generally permanent, so verifying before sending is essential.',
      ),
      q(
        'q4',
        'What is fee rate measured in?',
        [
          'Bitcoin per wallet',
          'Sats per virtual byte',
          'Confirmations per hour',
        ],
        1,
        'Fee rate is the fee per unit of transaction size, usually satoshis per virtual byte.',
      ),
      q(
        'q5',
        'What does replace-by-fee allow?',
        [
          'Reversing a transaction after it has been confirmed',
          'Recovering a lost seed phrase from a backup',
          'Replace an unconfirmed transaction at a higher fee',
        ],
        2,
        'Replace-by-fee lets a sender increase the fee on an unconfirmed transaction.',
      ),
    ],
  },
]
