import {
  example,
  list,
  note,
  p,
  reflect,
  terms,
  tip,
  warn,
  type CourseBundle,
} from '../types.js'

export const usingBitcoin: CourseBundle = {
  course: {
    slug: '05-using-bitcoin',
    title: 'Using Bitcoin',
    description:
      'Receiving, sending, fees and confirmations — what happens after you press send.',
    level: 'Beginner-plus',
    order: 5,
    estimatedMinutes: 16,
    modules: [{ slug: 'sending-and-receiving', title: 'Sending and receiving', order: 1 }],
  },
  lessons: [
    {
      slug: 'using-receive',
      courseSlug: '05-using-bitcoin',
      moduleSlug: 'sending-and-receiving',
      title: 'Receiving: addresses and confirmations',
      summary:
        'How to receive bitcoin safely, what a confirmation means, and why waiting matters.',
      order: 1,
      minutes: 8,
      objectives: [
        'Receive bitcoin to an address and verify it arrived.',
        'Explain what a confirmation is and why more confirmations increase confidence.',
        'Identify the risk of accepting an unconfirmed transaction for a valuable sale.',
      ],
      sections: [
        p(
          'To receive bitcoin on the base layer, you share an address with the sender. Your wallet watches the ledger for an output paying that address. The payment appears as unconfirmed until a miner includes it in a block; each later block adds another confirmation.',
          'One confirmation is usually enough for small amounts. For larger or irreversible exchanges of value, more confirmations are safer because reversing a transaction would require redoing the work behind each block.',
        ),
        terms(
          ['Address', 'Where bitcoin is sent. Safe to share.'],
          ['Unconfirmed', 'A transaction that is valid but not yet in a block.'],
          ['Confirmation', 'One block added after the block containing your transaction.'],
          ['Mempool', 'The waiting area for valid transactions not yet mined.'],
        ),
        list(
          'Check the address on your own screen before sharing it.',
          'A fresh address per payment improves privacy.',
          'Do not treat "seen in the mempool" as final settlement.',
          'For a valuable sale, wait for the number of confirmations you agreed.',
        ),
        example(
          'Selling a phone',
          'A buyer sends the payment. Your wallet shows it as unconfirmed. If you hand over the phone immediately, the buyer could attempt to replace the transaction with one paying themselves. Waiting for one or two confirmations makes that far harder. The wait is the protection.',
        ),
        warn(
          'Address mistakes are permanent',
          'If you send to an address on the wrong network or with a typo, the funds may be unrecoverable. Always verify the first and last characters, and prefer copying or scanning over typing.',
        ),
        reflect(
          'Why does a confirmation increase confidence, rather than proving a payment is "official"?',
        ),
      ],
    },
    {
      slug: 'using-fees',
      courseSlug: '05-using-bitcoin',
      moduleSlug: 'sending-and-receiving',
      title: 'Fees and confirmation times',
      summary:
        'How fees are set, why transactions get stuck, and how to choose a sensible fee.',
      order: 2,
      minutes: 8,
      objectives: [
        'Explain how the fee market works in plain language.',
        'Describe what happens when a fee is too low.',
        'Choose a sensible trade-off between cost and speed.',
      ],
      sections: [
        p(
          'Block space is limited. When more transactions are waiting than can fit in the next block, miners include the ones that pay the most per unit of space. The fee is not set by a company; it emerges from demand.',
          'A transaction with a low fee may wait hours or days in the mempool. Some wallets let you increase the fee later (replace-by-fee). Others do not, and you may have to wait for the network to clear.',
        ),
        terms(
          ['Fee rate', 'The fee per unit of transaction size, usually measured in satoshis per virtual byte.'],
          ['Mempool', 'The queue of valid transactions waiting to be included in a block.'],
          ['Replace-by-fee', 'A feature that lets a sender replace an unconfirmed transaction with one paying a higher fee.'],
        ),
        example(
          'Two moments in the same week',
          'On a quiet day, a small fee confirms in the next block. During a surge, the same fee may wait for hours. The difference is congestion, not your wallet misbehaving.',
        ),
        tip(
          'Match the fee to the urgency',
          'For a payment that must arrive today, pay more. For a transfer between your own wallets, pay less and wait. Do not overpay out of anxiety, and do not underpay for something time-sensitive.',
        ),
        note(
          'Lightning handles the small, fast case',
          'If you need many small payments quickly, the base layer is the wrong tool. That is what the Lightning Network is for, and it is the next course.',
        ),
        reflect(
          'When would paying a higher fee actually save you money?',
        ),
      ],
    },
  ],
}
