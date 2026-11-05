import { q, type QuizSeed } from '../types.js'

export const bitcoinWalletsQuizzes: QuizSeed[] = [
  {
    slug: 'wallets-keys-check',
    kind: 'lesson',
    courseSlug: '04-bitcoin-wallets',
    lessonSlug: 'wallets-keys',
    title: 'Check: private keys and public addresses',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'What does a wallet actually store?',
        [
          'Keys and signing tools, not bitcoin itself',
          'A physical coin inside the phone',
          'A copy of every other user\'s seed phrase',
        ],
        0,
        'Bitcoin exists on the public ledger. The wallet stores keys and helps create addresses, sign and read balances.',
      ),
      q(
        'q2',
        'Which can be shared safely?',
        [
          'A private key',
          'A public address',
          'A seed phrase',
        ],
        1,
        'Addresses are meant to be shared. Private keys and seed phrases authorise spending and must remain secret.',
      ),
    ],
  },
  {
    slug: 'wallets-seed-check',
    kind: 'lesson',
    courseSlug: '04-bitcoin-wallets',
    lessonSlug: 'wallets-seed',
    title: 'Check: seed phrases',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'What does a seed phrase restore?',
        [
          'Only the most recent transaction',
          'The Bitcoin network itself',
          'The wallet and all keys derived from its root secret',
        ],
        2,
        'A seed phrase encodes the root secret from which a wallet derives its keys and addresses.',
      ),
      q(
        'q2',
        'Which is a common backup mistake?',
        [
          'Storing a screenshot of the words in a cloud photo library',
          'Writing the words by hand on paper',
          'Testing a restore before storing real value',
        ],
        0,
        'A cloud screenshot is a digital copy that can be stolen remotely. The lesson warns against digital storage.',
      ),
    ],
  },
  {
    slug: 'bitcoin-wallets-assessment',
    kind: 'course',
    courseSlug: '04-bitcoin-wallets',
    title: 'Bitcoin Wallets assessment',
    passingScore: 80,
    questions: [
      q(
        'q1',
        'What is a watch-only wallet useful for?',
        [
          'Signing transactions without a key',
          'Tracking balances without holding keys',
          'Recovering a seed phrase from an exchange',
        ],
        1,
        'A watch-only wallet monitors balances using public information and does not hold the spending keys.',
      ),
      q(
        'q2',
        'Modern wallets can create many addresses from one seed. What is this called?',
        [
          'Mining',
          'Confirmation',
          'Derivation',
        ],
        2,
        'Derivation is computing keys and addresses from a starting secret such as a seed.',
      ),
      q(
        'q3',
        'Why is reusing one address not ideal?',
        [
          'It is worse for privacy',
          'It makes the bitcoin unspendable',
          'It changes the 21 million limit',
        ],
        0,
        'Reuse is not fatal, but fresh addresses improve privacy by making activity harder to link.',
      ),
      q(
        'q4',
        'Which backup routine matches the lesson?',
        [
          'Email the words to yourself for easy access',
          'Handwritten copies, separate places, restore test',
          'Share the words with a support agent so they can help',
        ],
        1,
        'The lesson recommends offline handwritten copies in separate trusted places and an actual restore test.',
      ),
      q(
        'q5',
        'What happens if a wallet uses an optional passphrase and you lose it?',
        [
          'The passphrase is emailed back by support',
          'The bitcoin automatically returns to the sender',
          'The seed alone will not restore the same wallet',
        ],
        2,
        'The passphrase is an extra secret; without it, the seed restores a different, empty wallet, so the protected funds are not accessible.',
      ),
    ],
  },
]
