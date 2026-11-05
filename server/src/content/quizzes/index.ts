import type { QuizSeed } from '../types.js'
import { bitcoin101Quizzes } from './01-bitcoin-101.js'
import { moneyAndBitcoinQuizzes } from './02-money-and-bitcoin.js'
import { howBitcoinWorksQuizzes } from './03-how-bitcoin-works.js'
import { bitcoinWalletsQuizzes } from './04-bitcoin-wallets.js'
import { usingBitcoinQuizzes } from './05-using-bitcoin.js'
import { lightningNetworkQuizzes } from './06-lightning-network.js'
import { stayingSafeQuizzes } from './07-staying-safe.js'
import { beyondBitcoinQuizzes } from './08-beyond-bitcoin.js'

export const quizzes: QuizSeed[] = [
  ...bitcoin101Quizzes,
  ...moneyAndBitcoinQuizzes,
  ...howBitcoinWorksQuizzes,
  ...bitcoinWalletsQuizzes,
  ...usingBitcoinQuizzes,
  ...lightningNetworkQuizzes,
  ...stayingSafeQuizzes,
  ...beyondBitcoinQuizzes,
]
