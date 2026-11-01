import {
  example,
  h,
  list,
  note,
  p,
  reflect,
  terms,
  warn,
  type LessonSeed,
} from '../types.js'

export const lessonsA: LessonSeed[] = [
  {
    slug: 'btc101-money-problem',
    courseSlug: '01-bitcoin-101',
    moduleSlug: 'why-bitcoin-exists',
    title: 'Money and the problem Bitcoin addresses',
    summary:
      'Why people look for an alternative to the money they already use, and what Bitcoin is trying to solve.',
    order: 1,
    minutes: 6,
    objectives: [
      'Explain what money is for, beyond buying things.',
      'Name three problems people face with money and payments.',
      'Describe Bitcoin as an attempt to solve some of those problems — not a promise to solve all of them.',
    ],
    sections: [
      p(
        'Imagine you sell vegetables at a market. A customer in another city wants to pay you. They use a mobile money service; you use a different one. Someone in the middle takes a cut, the rate changes while you wait, and the money arrives two days later. You did the work today, but you are paid next week.',
        'That is not a failure of one company. It is what happens when money has to move through several institutions, each with its own rules, hours and fees.',
      ),
      p(
        'Money is not only a thing you hold. It is a set of promises: that others will accept it, that it will still be worth something next month, and that you can move it when you need to. When those promises weaken, people look for alternatives.',
      ),
      h('Three problems people talk about'),
      list(
        'Purchasing power: prices rise, and the same amount of money buys less over time.',
        'Movement: sending money across borders or between networks can be slow and expensive.',
        'Permission: someone else can freeze an account, block a payment, or refuse to serve you.',
      ),
      p(
        'Bitcoin is an attempt to address some of these problems with a shared set of rules instead of a central institution. It is not the only attempt, and it is not a complete answer. It has real costs, real risks and real limitations — which this course will also cover.',
      ),
      terms(
        ['Inflation', 'A general rise in prices, which means each unit of money buys less than before.'],
        ['Remittance', 'Money sent by a worker to family or friends, often in another country.'],
        ['Purchasing power', 'How much real goods and services a fixed amount of money can buy.'],
      ),
      example(
        'A trader in Dakar and a customer in Abidjan',
        'Both use mobile money, but different providers. A transfer may pass through several intermediaries, each taking a fee. The trader cannot see the final amount until it arrives.',
        'Bitcoin does not automatically fix this. The customer still has to obtain bitcoin, and the trader still has to convert it. But the transfer itself can happen on one shared network, with visible fees, at any hour.',
      ),
      note(
        'No investment promises here',
        'This course explains how Bitcoin works. It does not tell you to buy it, hold it, or expect its price to rise. Bitcoin can lose value quickly, and nobody can promise otherwise.',
      ),
      reflect(
        'Think of the last time a payment you expected was delayed or cost more than you were told. Which part of that problem was about technology, and which part was about trust?',
      ),
    ],
  },
  {
    slug: 'btc101-what-is-bitcoin',
    courseSlug: '01-bitcoin-101',
    moduleSlug: 'why-bitcoin-exists',
    title: 'What Bitcoin is, in plain language',
    summary:
      'A beginner explanation of Bitcoin as a shared record kept by many computers, with no company in charge.',
    order: 2,
    minutes: 7,
    objectives: [
      'Describe Bitcoin as a shared ledger rather than a physical object.',
      'Explain what a node does and why many copies matter.',
      'Distinguish bitcoin (the unit) from Bitcoin (the network).',
    ],
    sections: [
      p(
        'Start with the simplest true sentence: Bitcoin is a record of who owns what, kept by many computers at once, with rules that decide how the record can change.',
        'There is no coin in a vault. There is no head office. When people say they "have bitcoin", they mean the shared record says a particular address can be spent with a particular key — and they hold that key.',
      ),
      h('A ledger, not a coin'),
      p(
        'A ledger is a list of entries. A bank keeps one privately; you see only your own row. Bitcoin keeps one publicly, and anyone can download and check it. That public record is called the blockchain because entries are grouped into blocks and linked in order.',
        'Because many independent computers keep and check the same record, no single one can quietly rewrite it. To change history, an attacker would have to redo work that the network keeps extending.',
      ),
      terms(
        ['Ledger', 'A record of transactions and balances.'],
        ['Node', 'A computer that keeps a copy of the Bitcoin ledger and checks the rules.'],
        ['Blockchain', 'The ordered chain of blocks that makes up the public ledger.'],
        ['Bitcoin (unit)', 'The unit of account, divided into 100 million satoshis.'],
        ['Satoshi', 'The smallest unit of bitcoin: 0.00000001 BTC.'],
      ),
      example(
        'Many bookkeepers, one book',
        'Imagine a market where every stall keeps an identical copy of the same sales book. If one stall tries to add a fake sale, the others compare notes and reject it. Bitcoin works in a similar spirit: many computers keep the book, and the rules for accepting an entry are the same for everyone.',
      ),
      p(
        'Bitcoin has a fixed supply limit written into its rules: no more than 21 million bitcoin will ever exist. New bitcoin is issued on a predictable schedule that slows over time. Scarcity alone does not make something valuable — usefulness and demand matter — but the limit is a deliberate design choice, not a promise of price.',
      ),
      warn(
        'Capital B, small b',
        'Bitcoin with a capital B usually means the network and its rules. bitcoin with a small b means the unit. You will see both, and the difference matters when you read technical material.',
      ),
      note(
        'You do not need to run a node to start learning',
        'Running a node is how you verify the ledger yourself. It is a good long-term goal, but it is not required to understand the ideas in this course.',
      ),
      reflect(
        'In your own words: if someone says "I have bitcoin", what do they actually control?',
      ),
    ],
    isPreview: true,
  },
  {
    slug: 'btc101-no-company',
    courseSlug: '01-bitcoin-101',
    moduleSlug: 'how-it-is-different',
    title: 'No company, no central office',
    summary:
      'What decentralisation means in practice, who maintains the network, and what it does not protect you from.',
    order: 3,
    minutes: 7,
    objectives: [
      'Explain who maintains Bitcoin and why no single party controls it.',
      'Describe what nodes, miners and consensus each do.',
      'Name two things decentralisation does not solve.',
    ],
    sections: [
      p(
        'Most payment systems have a company at the centre. That company decides who can open an account, what hours the service runs, and which transactions are allowed. Bitcoin has no such company.',
        'Instead, thousands of independent participants run software that follows the same rules. Some keep and verify the full ledger (nodes). Some add new blocks by doing computational work (miners). Some only use the network through a wallet. No participant can change the rules alone.',
      ),
      h('Who does what'),
      list(
        'Nodes check transactions and blocks against the rules, and reject anything invalid.',
        'Miners compete to produce new blocks; producing a valid block earns newly issued bitcoin and fees.',
        'Users hold keys and decide which transactions to sign.',
        'Developers propose improvements, but a change only takes effect if enough of the network adopts it.',
      ),
      terms(
        ['Decentralisation', 'Control and verification spread across many independent participants rather than one authority.'],
        ['Miner', 'A participant that assembles transactions into blocks and performs proof-of-work.'],
        ['Consensus', 'The process by which independent participants converge on the same valid history.'],
        ['Open source', 'Software whose code anyone can inspect, run and modify.'],
      ),
      example(
        'The 21 million limit',
        'A miner cannot decide to issue extra bitcoin. If it tries, nodes reject the block because it breaks the supply rule. Changing the rule would require widespread adoption by users and node operators — not a single announcement.',
      ),
      p(
        'Decentralisation has a cost. Decisions are slow. Improvements are hard to coordinate. Different groups argue for years. A central company can ship a feature on Monday; a decentralised network cannot. That trade-off is deliberate.',
      ),
      warn(
        'Decentralisation is not a shield around you personally',
        'The network may resist censorship, but the exchange where you buy bitcoin can freeze your account. The wallet app on your phone can be malicious. A merchant can refuse bitcoin. Bitcoin protects the ledger, not every step around it.',
      ),
      reflect(
        'Which parts of your current financial life depend on one institution saying yes? Which of those would you actually want to change?',
      ),
    ],
  },
  {
    slug: 'btc101-what-it-is-not',
    courseSlug: '01-bitcoin-101',
    moduleSlug: 'how-it-is-different',
    title: 'What Bitcoin is not',
    summary:
      'Common misunderstandings about Bitcoin, and the limitations the marketing usually leaves out.',
    order: 4,
    minutes: 7,
    objectives: [
      'Identify four common myths about Bitcoin.',
      'Explain why Bitcoin is not anonymous by default.',
      'Describe at least three real limitations of using Bitcoin.',
    ],
    sections: [
      p(
        'A new technology attracts exaggeration. Some people describe Bitcoin as free money, complete anonymity, or a guaranteed escape from every financial problem. None of those claims survives contact with how it actually works.',
      ),
      h('Four myths worth dropping'),
      list(
        '"It is a company or a stock." Bitcoin has no owner, no shares and no dividend. Holding it is not owning part of a business.',
        '"It is completely anonymous." The ledger is public. Addresses are not names, but transactions can often be linked to real identities through exchanges and patterns.',
        '"It is free money." Acquiring bitcoin costs money or work, using it costs fees, and its price can fall sharply.',
        '"It fixes every payment problem." Bitcoin has limited throughput on its base layer, price volatility, and a learning curve. Lightning helps with speed and cost, but adds its own complexity.',
      ),
      terms(
        ['Volatility', 'Large, frequent changes in price over short periods.'],
        ['Custody', 'Who holds the keys that control bitcoin. Self-custody means you do.'],
        ['Pseudonymous', 'Using an identifier that is not your real name, while activity remains publicly linkable.'],
      ),
      example(
        'A message that should make you suspicious',
        '"Send 0.01 BTC and we will double it." No legitimate service needs your bitcoin to prove anything. This is a common advance-fee scam, and it works because the amount feels small.',
      ),
      p(
        'Bitcoin also has genuine engineering limits. The base layer processes a limited number of transactions per second, which is why fees rise when demand is high. Confirmations take time. If you lose your keys and have no backup, nobody can restore access. These are not temporary bugs; they are consequences of the design.',
      ),
      warn(
        'Losing access is real',
        'There is no customer support line that can reset your Bitcoin password. If you self-custody, the backup is your responsibility. That is the point — and the risk.',
      ),
      note(
        'A healthy way to read Bitcoin claims',
        'When you see a claim, ask: who benefits if I believe it? What would have to be true for it to work? What is the worst case? These three questions will protect you more than any slogan.',
      ),
      reflect(
        'Which of the four myths had you heard before? What made it believable?',
      ),
    ],
  },
]
