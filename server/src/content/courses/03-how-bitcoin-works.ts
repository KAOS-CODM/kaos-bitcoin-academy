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
  type CourseBundle,
} from '../types.js'

export const howBitcoinWorks: CourseBundle = {
  course: {
    slug: '03-how-bitcoin-works',
    title: 'How Bitcoin Works',
    description:
      'The ledger, transactions, blocks and mining — explained without assuming a technical background.',
    level: 'Beginner-plus',
    order: 3,
    estimatedMinutes: 16,
    modules: [{ slug: 'transactions-and-the-ledger', title: 'Transactions and the ledger', order: 1 }],
  },
  lessons: [
    {
      slug: 'how-ledger',
      courseSlug: '03-how-bitcoin-works',
      moduleSlug: 'transactions-and-the-ledger',
      title: 'A ledger everyone can check',
      summary:
        'How the blockchain records history, why blocks are linked, and what makes rewriting the past expensive.',
      order: 1,
      minutes: 8,
      objectives: [
        'Describe a block and how it links to the previous one.',
        'Explain why changing an old block breaks the chain.',
        'State what a hash does without needing the mathematics.',
      ],
      sections: [
        p(
          'A blockchain is a sequence of blocks, each containing transactions and a reference to the block before it. That reference is a hash: a short fingerprint computed from the block’s contents.',
          'Change one character in a block and its hash changes completely. The next block still points to the old hash, so the chain no longer matches. Anyone checking the chain sees the break immediately.',
        ),
        h('Why order matters'),
        p(
          'Without an agreed order, two people could each claim the same coins were sent to them. The chain establishes a single history that everyone can verify. A transaction that appears in an earlier block is treated as settled relative to later ones.',
        ),
        terms(
          ['Block', 'A batch of transactions plus a reference to the previous block.'],
          ['Hash', 'A fixed-length fingerprint of data; a small change produces a completely different hash.'],
          ['Chain', 'The ordered sequence of blocks from the first to the latest.'],
        ),
        example(
          'Sealed pages',
          'Imagine a ledger where each page ends with a code derived from the page contents and the previous page code. If someone edits page 40, the code on page 40 changes, and every later page no longer matches. Repairing the whole book would take enormous work — which is exactly the point.',
        ),
        note(
          'Checking is not the same as trusting',
          'A node checks every block against the rules. You do not have to trust a company to tell you the balance; you can verify it yourself with the right software.',
        ),
        reflect(
          'Why would it be a problem if two different blocks could both be "the latest" forever?',
        ),
      ],
    },
    {
      slug: 'how-transaction',
      courseSlug: '03-how-bitcoin-works',
      moduleSlug: 'transactions-and-the-ledger',
      title: 'What a transaction actually contains',
      summary:
        'Inputs, outputs, fees and signatures — the anatomy of a Bitcoin transaction.',
      order: 2,
      minutes: 8,
      objectives: [
        'Name the main parts of a Bitcoin transaction.',
        'Explain what a signature proves.',
        'Describe why a fee exists and who receives it.',
      ],
      sections: [
        p(
          'A Bitcoin transaction spends outputs that already exist. Each output locks an amount to a condition — usually "whoever can sign with the key behind this address". To spend it, the sender references that output as an input and provides a valid signature.',
          'The difference between the total inputs and total outputs is the fee. There is no separate fee field; the fee is what remains unassigned. Miners collect it when they include the transaction in a block.',
        ),
        terms(
          ['Input', 'A reference to a previous output being spent.'],
          ['Output', 'An amount assigned to an address or spending condition.'],
          ['Signature', 'Cryptographic proof that the spender controls the key.'],
          ['Fee', 'The difference between inputs and outputs, collected by the miner.'],
        ),
        list(
          'Inputs: which coins are being spent.',
          'Outputs: where the coins go, and how much.',
          'Signature: proof of authorisation.',
          'Fee: the leftover value that motivates inclusion in a block.',
        ),
        example(
          'Paying with a large note',
          'If you have one output worth 100,000 sats and want to pay 30,000, the transaction spends the whole output and creates a 30,000 output for the recipient plus a change output back to you, minus the fee. The "note" is spent whole; change comes back.',
        ),
        warn(
          'A signature is not a password',
          'You never send your private key to the network. The wallet creates a signature that is valid only for that transaction. A signature cannot be reused to spend other coins.',
        ),
        tip(
          'Testnet exists',
          'Developers rehearse with test networks that use worthless coins. It is the right place to practise transaction mechanics before touching real funds.',
        ),
        reflect(
          'Why is the fee not simply written into the transaction as a separate charge to an address?',
        ),
      ],
    },
  ],
}
