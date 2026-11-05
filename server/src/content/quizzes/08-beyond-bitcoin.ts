import { q, type QuizSeed } from '../types.js'

export const beyondBitcoinQuizzes: QuizSeed[] = [
  {
    slug: 'beyond-nostr-check',
    kind: 'lesson',
    courseSlug: '08-beyond-bitcoin',
    lessonSlug: 'beyond-nostr',
    title: 'Check: Nostr and portable identity',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'What is the difference between a protocol and a platform?',
        [
          'A protocol is a shared set of rules; a platform is a specific service',
          'A protocol owns the servers; a platform is open source',
          'They are exactly the same thing',
        ],
        0,
        'Different apps can implement a protocol, while a platform is a particular service that can control its own database.',
      ),
      q(
        'q2',
        'What happens if you lose your Nostr private key?',
        [
          'The relays restore it automatically',
          'You lose the identity associated with that key',
          'The network resets the key for you',
        ],
        1,
        'Identity follows the key. Without the private key, you cannot sign as that identity.',
      ),
    ],
  },
  {
    slug: 'beyond-next-check',
    kind: 'lesson',
    courseSlug: '08-beyond-bitcoin',
    lessonSlug: 'beyond-next',
    title: 'Check: where to go next',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'Which list names directions from the lesson?',
        [
          'Miner, exchange, regulator and advertiser',
          'Trader, marketer, influencer and lender',
          'Confident user, builder, researcher and educator',
        ],
        2,
        'The lesson lists confident user, builder, researcher and educator as directions.',
      ),
      q(
        'q2',
        'What is the "smallest useful project" example?',
        [
          'A page that takes a transaction ID and shows its confirmations',
          'A new Bitcoin fork',
          'A trading bot with borrowed money',
        ],
        0,
        'The example is a small page that looks up a transaction and displays confirmations.',
      ),
    ],
  },
  {
    slug: 'beyond-bitcoin-assessment',
    kind: 'course',
    courseSlug: '08-beyond-bitcoin',
    title: 'Beyond Bitcoin assessment',
    passingScore: 80,
    questions: [
      q(
        'q1',
        'In Nostr, what serves as your identity?',
        [
          'A company account number',
          'A key pair',
          'A relay URL only',
        ],
        1,
        'Nostr identity is a key pair: you sign with the private key and others verify with the public key.',
      ),
      q(
        'q2',
        'What does a relay do?',
        [
          'Mine bitcoin blocks for the network',
          'Hold your wallet seed phrase securely',
          'Store and forward events',
        ],
        2,
        'A relay is a server that stores and forwards Nostr events.',
      ),
      q(
        'q3',
        'Why can your Nostr identity move between apps?',
        [
          'Identity follows the key, not the app',
          'Every app shares one company database',
          'Relays assign you a new identity each time',
        ],
        0,
        'Because identity is a key pair, different apps that speak the protocol can use the same identity.',
      ),
      q(
        'q4',
        'What is a BIP?',
        [
          'A Bitcoin investment product',
          'Bitcoin Improvement Proposal',
          'A backup instruction page',
        ],
        1,
        'BIP stands for Bitcoin Improvement Proposal, a document describing a proposed change or standard.',
      ),
      q(
        'q5',
        'Which habit carries forward from the academy?',
        [
          'Trust anyone who promises to recover funds',
          'Skip backups when you are in a hurry',
          'Verify, start small, explain reasoning',
        ],
        2,
        'The lesson closes with verifying, starting small and making reasoning checkable.',
      ),
    ],
  },
]
