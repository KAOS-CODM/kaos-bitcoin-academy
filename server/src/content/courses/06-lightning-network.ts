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

export const lightningNetwork: CourseBundle = {
  course: {
    slug: '06-lightning-network',
    title: 'Lightning Network',
    description:
      'Why Bitcoin needed a second layer, how payment channels work, and what an invoice really contains.',
    level: 'Intermediate',
    order: 6,
    estimatedMinutes: 18,
    modules: [{ slug: 'why-lightning', title: 'Why Lightning', order: 1 }],
  },
  lessons: [
    {
      slug: 'ln-scaling',
      courseSlug: '06-lightning-network',
      moduleSlug: 'why-lightning',
      title: 'The scaling problem',
      summary:
        'Why the base layer cannot process every small payment, and what a second layer changes.',
      order: 1,
      minutes: 9,
      objectives: [
        'Explain why base-layer Bitcoin limits transaction throughput.',
        'Describe what a second layer can and cannot fix.',
        'Distinguish on-chain settlement from off-chain payments.',
      ],
      sections: [
        p(
          'Every Bitcoin block has limited space. That is a deliberate trade-off: larger blocks are cheaper to fill but more expensive to store and verify, which pushes ordinary users away from running a node. The result is a base layer that settles relatively few transactions per second.',
          'For buying a bag of rice, waiting ten minutes and paying a fee larger than the purchase is not workable. Lightning moves most payments off-chain while keeping the base layer as the final settlement layer.',
        ),
        h('What a second layer changes'),
        list(
          'Payments can be near-instant because they do not wait for a block.',
          'Fees are usually tiny because the payment is not competing for block space.',
          'Final settlement still happens on the base layer when channels close.',
        ),
        terms(
          ['Layer 2', 'A system built on top of the base chain that settles back to it.'],
          ['On-chain', 'A transaction recorded directly in a Bitcoin block.'],
          ['Off-chain', 'A payment that happens without a separate base-layer transaction for each payment.'],
          ['Channel', 'A funded relationship between two parties that allows many off-chain payments.'],
        ),
        example(
          'A tab at a shop',
          'Instead of paying for each item separately, you open a tab. Many purchases are recorded between you and the shop, and the balance is settled once at the end. A Lightning channel works in a similar spirit: many payments, one on-chain settlement when the channel closes.',
        ),
        warn(
          'Not a free lunch',
          'Lightning adds complexity: you need liquidity, channels can fail, and backups are different from on-chain wallets. It solves throughput, not every usability problem.',
        ),
        reflect(
          'Why not simply make the blocks enormous? What would that cost?',
        ),
      ],
    },
    {
      slug: 'ln-channels',
      courseSlug: '06-lightning-network',
      moduleSlug: 'why-lightning',
      title: 'Channels, liquidity and invoices',
      summary:
        'How a channel holds a balance, why receiving requires inbound liquidity, and what an invoice tells you.',
      order: 2,
      minutes: 9,
      objectives: [
        'Describe how a channel balance changes with payments.',
        'Explain inbound and outbound liquidity.',
        'Identify the key fields of a Lightning invoice.',
      ],
      sections: [
        p(
          'A channel is funded by an on-chain transaction. Once open, the two parties can move the balance back and forth without touching the base layer. Each payment updates the channel state; only closing the channel produces another on-chain transaction.',
          'Liquidity is the practical constraint. To send, you need balance on your side. To receive, the other side must have balance to send to you. A new channel opened by you typically gives you outbound liquidity but little inbound, which is why receiving can fail even when everything looks connected.',
        ),
        terms(
          ['Inbound liquidity', 'The ability to receive: funds on the other side of your channels.'],
          ['Outbound liquidity', 'The ability to send: funds on your side of your channels.'],
          ['Routing', 'Forwarding a payment through several channels to reach the recipient.'],
          ['Invoice', 'A payment request containing an amount, a recipient and an expiry.'],
        ),
        h('What an invoice contains'),
        list(
          'The amount requested, in satoshis.',
          'A description or payment hash identifying the request.',
          'The recipient, encoded in the invoice.',
          'An expiry, after which the invoice can no longer be paid.',
          'A network marker, so a mainnet invoice is not confused with a test one.',
        ),
        example(
          'Expired is not failed',
          'If an invoice expires before you pay, nothing was sent. That is different from attempting a payment and having it rejected. The first is a closed request; the second is a failed attempt. Good interfaces never confuse the two.',
        ),
        warn(
          'Your wallet authorises, not the website',
          'A website can show you an invoice and ask you to pay. Only your wallet can approve the transfer. Any site claiming it can pay on your behalf without approval is asking for control it should not have.',
        ),
        tip(
          'Read before you pay',
          'Check the amount, the description and the expiry. If the amount is larger than you expected, stop. That habit prevents most costly mistakes.',
        ),
        reflect(
          'Why can a channel run out of ability to receive even when it has plenty of balance on your side?',
        ),
      ],
    },
  ],
}
