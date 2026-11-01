import {
  example,
  h,
  list,
  note,
  p,
  reflect,
  terms,
  tip,
  type CourseBundle,
} from '../types.js'

export const beyondBitcoin: CourseBundle = {
  course: {
    slug: '08-beyond-bitcoin',
    title: 'Beyond Bitcoin',
    description:
      'Nostr, applications, and the paths available to learners who want to build on what they have understood.',
    level: 'Intermediate',
    order: 8,
    estimatedMinutes: 14,
    modules: [{ slug: 'what-else-is-built', title: 'What else is built on Bitcoin', order: 1 }],
  },
  lessons: [
    {
      slug: 'beyond-nostr',
      courseSlug: '08-beyond-bitcoin',
      moduleSlug: 'what-else-is-built',
      title: 'Nostr and portable identity',
      summary:
        'A simple protocol for open social identity, and how it relates to keys you already understand.',
      order: 1,
      minutes: 7,
      objectives: [
        'Describe what Nostr is and what problem it addresses.',
        'Explain how a key pair is used for identity.',
        'Distinguish a protocol from a platform.',
      ],
      sections: [
        p(
          'Nostr is a protocol for publishing short messages and other events. It does not own a server or a feed. Your identity is a key pair: you sign events with a private key, and others verify them with your public key.',
          'Because identity is a key rather than an account on a company\'s database, you can move between apps that speak the protocol. Your followers are not owned by one platform, and no single company can delete your identity everywhere.',
        ),
        terms(
          ['Protocol', 'A shared set of rules that different software can implement.'],
          ['Event', 'A signed piece of content published to relays.'],
          ['Relay', 'A server that stores and forwards events.'],
          ['Key pair', 'A private key for signing and a public key for verification.'],
        ),
        example(
          'One identity, several apps',
          'You create a key pair in one app, publish notes, then open a different app and use the same key. Your identity and content follow the key, not the app. That is the difference between a protocol and a platform.',
        ),
        list(
          'You choose which relays to use.',
          'Relays can refuse content; another relay may accept it.',
          'Losing the private key means losing the identity.',
        ),
        note(
          'Not part of the hackathon',
          'The academy does not require Nostr. This lesson exists so you can recognise the pattern: keys, signatures and open protocols appear far beyond Bitcoin.',
        ),
        tip(
          'The transferable idea',
          'Once you understand that a key can prove authorship without a central account, many systems become easier to read — including wallets, login systems and signed documents.',
        ),
        reflect(
          'What would change about social media if your identity were a key you controlled rather than an account someone could suspend?',
        ),
      ],
    },
    {
      slug: 'beyond-next',
      courseSlug: '08-beyond-bitcoin',
      moduleSlug: 'what-else-is-built',
      title: 'Where to go next',
      summary:
        'A realistic map of directions: builder, user, researcher, or simply a safer participant.',
      order: 2,
      minutes: 7,
      objectives: [
        'Name three directions a learner can take after this course.',
        'Identify one concrete next project for each direction.',
        'Choose a next step that matches your own goals.',
      ],
      sections: [
        p(
          'There is no single correct path after the basics. The useful question is what you want to be able to do, not which technology is trending.',
        ),
        h('Four directions'),
        list(
          'Confident user: practise small payments, learn wallet recovery, and build a personal safety routine.',
          'Builder: learn JavaScript or Python, then build a small tool that reads public ledger data.',
          'Researcher: read primary sources — protocol documentation, BIPs, and code — rather than summaries.',
          'Educator: teach one person what you learned, and notice which explanation they found confusing.',
        ),
        terms(
          ['BIP', 'Bitcoin Improvement Proposal: a document describing a proposed change or standard.'],
          ['Testnet', 'A network using worthless coins for development and practice.'],
          ['Open source', 'Code anyone can inspect and contribute to.'],
        ),
        example(
          'The smallest useful project',
          'Build a page that takes a transaction ID and shows its confirmations. You will learn how to call an API, how to handle errors, and why the difference between "seen" and "confirmed" matters in practice.',
        ),
        p(
          'Whichever direction you choose, the habits from this academy stay the same: verify rather than assume, start small, and explain your reasoning so others can check it.',
        ),
        reflect(
          'Which direction fits the problem you actually want to solve? Write down one action you can take this week.',
        ),
      ],
    },
  ],
}
