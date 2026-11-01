import {
  example,
  h,
  list,
  note,
  p,
  reflect,
  terms,
  tip,
  warn,
  type LessonSeed,
} from '../types.js'

export const lessonsB: LessonSeed[] = [
  {
    slug: 'btc101-keys',
    courseSlug: '01-bitcoin-101',
    moduleSlug: 'staying-safe-basics',
    title: 'Your keys, your coins',
    summary:
      'What a private key is, what custody means, and why the phrase "not your keys, not your coins" matters.',
    order: 5,
    minutes: 7,
    objectives: [
      'Explain the relationship between a private key, a public address and control of bitcoin.',
      'Distinguish self-custody from custody at a service.',
      'Describe what a seed phrase is and why it must never be shared.',
    ],
    sections: [
      p(
        'Bitcoin ownership is control of a key. A private key is a long secret number. From it, a wallet derives a public address that others can send to. Spending requires signing with the private key — and only the key holder can do that.',
        'This is why people say: not your keys, not your coins. If a company holds the key, the company controls the bitcoin. You may have a balance on a screen, but you are trusting that company to honour it.',
      ),
      h('Two ways to hold bitcoin'),
      list(
        'Self-custody: you hold the keys, usually through a wallet app or hardware device. You control it; you are also responsible for backups.',
        'Custodial: an exchange or app holds the keys for you. It is easier to start, but you depend on that service staying solvent, honest and available.',
      ),
      terms(
        ['Private key', 'A secret number that allows bitcoin to be spent. Never share it.'],
        ['Public address', 'An identifier others can send bitcoin to. Sharing it is safe.'],
        ['Seed phrase', 'A human-readable backup of a wallet, usually 12 or 24 words. It is as powerful as the keys themselves.'],
        ['Custody', 'Who holds the keys controlling the bitcoin.'],
      ),
      example(
        'A key and a mailbox',
        'An address is like a mailbox number: you can give it to anyone so they can send you letters. The private key is the key to open the mailbox. Giving out the address is normal. Giving out the key means anyone can take what is inside.',
      ),
      warn(
        'The seed phrase is the wallet',
        'Anyone who has your 12 or 24 words can restore your wallet and take everything. No legitimate support agent will ask for it. No website needs it. No "verification" requires it. If someone asks, it is a scam — every time.',
      ),
      note(
        'A small amount first',
        'When you eventually move from reading to doing, start with an amount you can afford to lose while you learn. Confidence should come from practice, not from optimism.',
      ),
      reflect(
        'If a company holds your bitcoin and closes tomorrow, what would you still control?',
      ),
    ],
  },
  {
    slug: 'btc101-scams',
    courseSlug: '01-bitcoin-101',
    moduleSlug: 'staying-safe-basics',
    title: 'Scams that target beginners',
    summary:
      'The patterns behind common Bitcoin scams, and a simple routine that stops most of them.',
    order: 6,
    minutes: 8,
    objectives: [
      'Recognise the five most common beginner scams.',
      'Explain why urgency and secrecy are warning signs.',
      'Apply a three-step check before sending money or sharing information.',
    ],
    sections: [
      p(
        'Most Bitcoin scams are not technical. They are social: they create urgency, offer something too good to be true, or pretend to be someone you trust. The technology is only the payment rail at the end.',
      ),
      h('Five patterns to recognise'),
      list(
        'Fake support: someone messages you claiming to be from a wallet or exchange and asks you to "verify" by sharing your seed phrase or installing software.',
        'Advance fee: you are told you have won or earned something, but must pay a small fee first.',
        'Fake investment: a group shows screenshots of profits and pressures you to deposit quickly.',
        'Recovery scam: after you lose money, someone offers to recover it for a fee. They cannot.',
        'Impersonation: a cloned website, social account or phone number that looks almost right.',
      ),
      terms(
        ['Phishing', 'Tricking someone into revealing secrets or installing malicious software by pretending to be trustworthy.'],
        ['Social engineering', 'Manipulating people rather than breaking technology.'],
        ['Seed phrase', 'The backup words that control a wallet. Never share them.'],
      ),
      example(
        'The urgent support message',
        '"Your wallet is at risk. Send your 12 words so we can secure it." A real wallet provider never needs your words, and real urgency is rare. The message is designed to make you act before you think.',
      ),
      p(
        'Urgency is the mechanism. Secrecy is the second: you are told not to tell family or friends, because they would ask obvious questions. A legitimate opportunity survives being discussed with someone you trust.',
      ),
      tip(
        'The three-step check',
        '1. Stop. No legitimate request needs an answer in the next five minutes.',
        '2. Verify through a channel you chose yourself — the official app, a saved phone number, a typed address. Never through the link you were sent.',
        '3. Ask someone you trust. If you feel embarrassed to ask, that is a warning, not a reason to stay quiet.',
      ),
      warn(
        'No one can recover lost bitcoin for you',
        'Transactions are irreversible. Anyone promising recovery is targeting you a second time.',
      ),
      reflect(
        'Which of the five patterns would be hardest for you to spot in the moment? Why?',
      ),
    ],
  },
  {
    slug: 'btc101-what-you-can-do',
    courseSlug: '01-bitcoin-101',
    moduleSlug: 'next-steps',
    title: 'What you can do with Bitcoin today',
    summary:
      'Realistic uses, realistic limits, and how to think about the first small step.',
    order: 7,
    minutes: 6,
    objectives: [
      'Name three realistic uses of Bitcoin and one situation where it is a poor fit.',
      'Explain why volatility matters for everyday payments.',
      'Describe a safe first experiment that does not risk money you need.',
    ],
    sections: [
      p(
        'Bitcoin is used for payments, for savings, for remittances, and for learning about digital money. Each use has conditions. None of them is a guarantee.',
      ),
      h('Where it fits reasonably well'),
      list(
        'Cross-border transfers where both sides can use the network and speed matters.',
        'Payments to people who cannot easily open a conventional account.',
        'Holding value outside a banking system — if you accept the volatility and custody risk.',
        'Learning: understanding digital ownership is useful even if you never hold much.',
      ),
      p(
        'Where it fits poorly: everyday small purchases if fees are high, wages if prices swing sharply, or any situation where you cannot afford to lose the amount involved. Volatility is not a detail; it changes what money is useful for.',
      ),
      terms(
        ['Volatility', 'How much a price moves over time.'],
        ['Liquidity', 'How easily something can be bought or sold without moving the price.'],
        ['Fees', 'The cost of sending a transaction, paid to the network.'],
      ),
      example(
        'A small first experiment',
        'A learner sets up a wallet, receives a very small amount, sends part of it back, and watches the transaction confirm. The goal is to see each step, not to make money. The amount is chosen so that losing it would be annoying but not harmful.',
      ),
      note(
        'Learning before earning',
        'You do not need to own bitcoin to understand it. If you do experiment, use an amount you can afford to lose and keep the rest of your finances separate.',
      ),
      reflect(
        'What would you want to understand before you trusted yourself to send a real payment?',
      ),
    ],
  },
  {
    slug: 'btc101-recap',
    courseSlug: '01-bitcoin-101',
    moduleSlug: 'next-steps',
    title: 'Recap: explain Bitcoin in your own words',
    summary:
      'The five ideas that hold the course together, and where to go next.',
    order: 8,
    minutes: 5,
    objectives: [
      'Summarise Bitcoin without using marketing language.',
      'Connect the five core ideas to the rest of the curriculum.',
      'Choose the next course that matches your question.',
    ],
    sections: [
      p(
        'If you can explain these five ideas to a friend — including the limits — you have the foundation the rest of the academy builds on.',
      ),
      list(
        'Bitcoin is a shared record, kept and checked by many independent computers.',
        'Control comes from keys. Losing the keys means losing access, and there is no reset.',
        'No company runs the network. That makes it resistant to control, and slow to change.',
        'It is not anonymous, not free money, and not a guarantee of anything.',
        'Scams target people, not software. Urgency and secrecy are the signals.',
      ),
      p(
        'The next courses go deeper. Money and Bitcoin examines what money does and why scarcity matters. How Bitcoin Works opens the ledger. Bitcoin Wallets explains keys and backups properly. Using Bitcoin covers fees and confirmations. Lightning Network explains fast payments. Staying Safe turns the scam patterns into a routine. Beyond Bitcoin looks at what else is being built.',
      ),
      terms(
        ['Ledger', 'A record of transactions and balances.'],
        ['Keys', 'The secrets that control bitcoin.'],
        ['Consensus', 'How independent participants agree on the valid history.'],
      ),
      tip(
        'A good test of understanding',
        'Explain Bitcoin to someone in two minutes, then let them ask you one hard question. If you can say "I do not know yet, and here is how I would find out", you are doing better than most confident explanations.',
      ),
      reflect(
        'Write one sentence you would say to a friend who asked: "So what is Bitcoin, really?"',
      ),
    ],
  },
]
