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

export const stayingSafe: CourseBundle = {
  course: {
    slug: '07-staying-safe',
    title: 'Staying Safe',
    description:
      'How scams work, how to verify before you trust, and the habits that protect beginners.',
    level: 'Beginner',
    order: 7,
    estimatedMinutes: 15,
    modules: [{ slug: 'spotting-scams', title: 'Spotting scams', order: 1 }],
  },
  lessons: [
    {
      slug: 'safe-scams',
      courseSlug: '07-staying-safe',
      moduleSlug: 'spotting-scams',
      title: 'How beginner scams actually work',
      summary:
        'The psychology scammers rely on, and the patterns that repeat across every platform.',
      order: 1,
      minutes: 8,
      objectives: [
        'Identify the emotional levers scammers use.',
        'Recognise the structure of a typical beginner scam.',
        'Explain why verification must use a channel you chose.',
      ],
      sections: [
        p(
          'Scams are designed around a moment of decision. They create urgency, isolate you from people who would ask questions, and offer a reward that feels just within reach. The technology changes; the structure does not.',
        ),
        h('The structure'),
        list(
          'Contact: a message, call, advert or direct message arrives unexpectedly.',
          'Hook: a warning ("your account is at risk") or an opportunity ("double your bitcoin").',
          'Pressure: a deadline, a threat, or excitement that discourages thinking.',
          'Request: share a seed phrase, install software, send a small "verification" payment, or deposit funds.',
          'Disappearance: once the value moves, the account or person vanishes.',
        ),
        terms(
          ['Phishing', 'Pretending to be a trusted service to obtain secrets.'],
          ['Impersonation', 'Copying a person or brand to gain trust.'],
          ['Verification', 'Checking a claim independently through a channel you chose.'],
        ),
        example(
          'The cloned support account',
          'A learner posts a question publicly. A reply appears within seconds with a support logo and a helpful tone. It asks them to move to a private chat, then to "validate" the wallet. The speed and helpfulness are the disguise.',
        ),
        p(
          'The strongest defence is procedural, not emotional: never verify through the channel that contacted you. Open the official app yourself, type the address yourself, call the number you already had. If the only way to verify is the link they sent, you are not verifying — you are complying.',
        ),
        warn(
          'Secrecy is a red flag',
          'If someone tells you not to discuss it with family, a colleague or your bank, the reason is that those people would stop you. Legitimate opportunities survive questions.',
        ),
        reflect(
          'Which emotional lever — fear, urgency or opportunity — would most affect you? Knowing that is a practical defence.',
        ),
      ],
    },
    {
      slug: 'safe-checklist',
      courseSlug: '07-staying-safe',
      moduleSlug: 'spotting-scams',
      title: 'A checklist before you send',
      summary:
        'A short, repeatable routine for payments, connections and downloads.',
      order: 2,
      minutes: 7,
      objectives: [
        'Apply a five-point checklist before any Bitcoin transaction.',
        'Explain why a small test payment is useful.',
        'Describe what to do after a suspected compromise.',
      ],
      sections: [
        p(
          'Checklists are boring, which is why they work. Under pressure, you do not rise to the occasion; you fall back on the routine you practised.',
        ),
        h('Before sending'),
        list(
          'Who is receiving? Can I state their identity without relying on this message?',
          'What exactly am I paying for, and does the amount match what I agreed?',
          'Is this the right network and the right address? Check first and last characters.',
          'Have I tested with a small amount when the destination is new?',
          'Would I still be okay if this money were lost?',
        ),
        p(
          'If any answer is unclear, stop. A delayed payment is recoverable; a sent payment is not.',
        ),
        terms(
          ['Test payment', 'A small transaction sent first to confirm the destination and process.'],
          ['Compromise', 'A situation where someone else may have obtained your keys or access.'],
          ['Revoke', 'Removing an app\'s permission or disconnecting a session.'],
        ),
        example(
          'A new exchange withdrawal address',
          'You copy a withdrawal address from an exchange. Before sending a large amount, send a small test and confirm it arrives. If the address was altered by malware, the test reveals it at a low cost.',
        ),
        tip(
          'If you suspect a compromise',
          'Move remaining funds to a new wallet you control, from a device you trust. Change passwords and revoke sessions. Do not accept help from anyone who contacted you first.',
        ),
        reflect(
          'Which step of the checklist are you most likely to skip when you are in a hurry?',
        ),
      ],
    },
  ],
}
