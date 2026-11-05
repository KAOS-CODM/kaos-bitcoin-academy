import { q, type QuizSeed } from '../types.js'

export const moneyAndBitcoinQuizzes: QuizSeed[] = [
  {
    slug: 'money-three-jobs-check',
    kind: 'lesson',
    courseSlug: '02-money-and-bitcoin',
    lessonSlug: 'money-three-jobs',
    title: 'Check: the three jobs of money',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'Which list gives the three functions of money?',
        [
          'Medium of exchange, unit of account, store of value',
          'Mining, custody, confirmation',
          'Scarcity, volatility, liquidity',
        ],
        0,
        'The lesson describes money as a medium of exchange, a unit of account, and a store of value.',
      ),
      q(
        'q2',
        'Why is bitcoin described as a difficult unit of account for daily pricing?',
        [
          'Because it has no addresses',
          'Because its price is volatile',
          'Because only miners can hold it',
        ],
        1,
        'A seller would have to re-price constantly as bitcoin\'s exchange rate moved, which makes it a difficult unit of account.',
      ),
    ],
  },
  {
    slug: 'money-scarcity-check',
    kind: 'lesson',
    courseSlug: '02-money-and-bitcoin',
    lessonSlug: 'money-scarcity',
    title: 'Check: scarcity and inflation',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'What does a fixed supply guarantee?',
        [
          'Stable purchasing power',
          'A stable price in local currency',
          'A limit on issuance, but not stable value',
        ],
        2,
        'The cap limits how many units can exist. Demand and speculation can still change the price.',
      ),
      q(
        'q2',
        'What is inflation in the lesson?',
        [
          'A general rise in prices that reduces what each unit of money buys',
          'A rise in the number of bitcoin miners',
          'A fee charged for sending bitcoin',
        ],
        0,
        'Inflation is a general rise in prices, which lowers purchasing power.',
      ),
    ],
  },
  {
    slug: 'money-bitcoin-assessment',
    kind: 'course',
    courseSlug: '02-money-and-bitcoin',
    title: 'Money and Bitcoin assessment',
    passingScore: 80,
    questions: [
      q(
        'q1',
        'A market seller quotes prices in the local currency because customers and sellers share it. Which function is being described?',
        [
          'Store of value',
          'Unit of account',
          'Medium of exchange',
        ],
        1,
        'A shared measure for quoting prices is the unit-of-account function.',
      ),
      q(
        'q2',
        'Mobile money is fast and widely accepted in its home market. Which function does that best describe?',
        [
          'A store of value held for the long term',
          'A fixed supply enforced by the network',
          'Medium of exchange',
        ],
        2,
        'Being accepted for payments is the medium-of-exchange function.',
      ),
      q(
        'q3',
        'A currency loses purchasing power over time. What does that mean?',
        [
          'The same amount buys fewer goods',
          'The currency becomes more scarce',
          'Every price falls',
        ],
        0,
        'Purchasing power is how much real goods and services a fixed amount can buy; when it falls, the same amount buys less.',
      ),
      q(
        'q4',
        'Bitcoin has a 21 million cap. Which claim is supported by the lesson?',
        [
          'The cap guarantees a rising price over time',
          'It limits issuance but not stable value',
          'The cap removes all price volatility',
        ],
        1,
        'The lesson distinguishes a fixed supply from stable value or price.',
      ),
      q(
        'q5',
        'What enforces Bitcoin\'s issuance limit?',
        [
          'A promise from a company that issues bitcoin',
          'A monthly vote by the largest exchanges',
          'Network rules checked by nodes',
        ],
        2,
        'The cap is enforced by the network\'s rules, not by a company or exchange.',
      ),
    ],
  },
]
