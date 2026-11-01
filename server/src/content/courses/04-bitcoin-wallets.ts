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

export const bitcoinWallets: CourseBundle = {
  course: {
    slug: '04-bitcoin-wallets',
    title: 'Bitcoin Wallets',
    description:
      'Keys, addresses, seed phrases and custody — what a wallet really stores, and how to protect it.',
    level: 'Beginner-plus',
    order: 4,
    estimatedMinutes: 16,
    modules: [{ slug: 'keys-and-addresses', title: 'Keys and addresses', order: 1 }],
  },
  lessons: [
    {
      slug: 'wallets-keys',
      courseSlug: '04-bitcoin-wallets',
      moduleSlug: 'keys-and-addresses',
      title: 'Private keys and public addresses',
      summary:
        'How a wallet derives addresses from a key, and why the key never leaves your device.',
      order: 1,
      minutes: 8,
      objectives: [
        'Explain the relationship between a private key and a public address.',
        'Describe what a wallet actually stores.',
        'Distinguish a wallet app from the bitcoin itself.',
      ],
      sections: [
        p(
          'A wallet does not store bitcoin. Bitcoin exists as entries on the public ledger. A wallet stores keys and helps you create addresses, sign transactions and read balances.',
          'From a private key, the wallet derives public keys and addresses. Addresses can be shared freely. The private key must never leave the device except as an encrypted backup you control.',
        ),
        terms(
          ['Private key', 'A secret value that authorises spending.'],
          ['Public address', 'A destination others can send to.'],
          ['Wallet', 'Software or hardware that manages keys and builds transactions.'],
          ['Derivation', 'Computing addresses and keys from a starting secret.'],
        ),
        example(
          'One seed, many addresses',
          'Modern wallets derive many addresses from one seed phrase. You can show a new address for each payment and still restore everything from the same backup. Reusing one address is not fatal, but fresh addresses are better for privacy.',
        ),
        note(
          'Watch-only is a useful middle ground',
          'A watch-only wallet tracks balances using public information without holding the keys. It is useful for monitoring a savings wallet kept offline.',
        ),
        warn(
          'Screenshots and cloud notes',
          'A photo of your seed phrase in a cloud photo library is a copy you no longer control. So is a plain text note synced to an account. Backups need to be offline and deliberate.',
        ),
        reflect(
          'If your phone were lost right now, what would you need to recover a self-custody wallet?',
        ),
      ],
    },
    {
      slug: 'wallets-seed',
      courseSlug: '04-bitcoin-wallets',
      moduleSlug: 'keys-and-addresses',
      title: 'Seed phrases: the one thing to protect',
      summary:
        'What the 12 or 24 words do, how backups fail, and the rules that prevent most losses.',
      order: 2,
      minutes: 8,
      objectives: [
        'Explain what a seed phrase restores.',
        'Identify three common backup mistakes.',
        'Describe a reasonable backup routine for a beginner.',
      ],
      sections: [
        p(
          'A seed phrase is a human-readable encoding of the root secret from which a wallet derives all its keys. Anyone with the words can restore the wallet and spend its bitcoin. There is no password reset and no support desk that can undo a leak.',
        ),
        h('How backups fail'),
        list(
          'Stored digitally: screenshots, notes, email drafts and cloud drives are all copies that can be stolen remotely.',
          'Stored in one place: fire, flood, theft or a lost bag removes the only copy.',
          'Shared "for safety": a family member or "support agent" who knows the words is now a co-owner.',
          'Never tested: a backup you have never restored may be wrong — a misspelled word is enough.',
        ),
        terms(
          ['Seed phrase', '12 or 24 words that encode the wallet root secret.'],
          ['Restore', 'Recovering a wallet from its seed phrase.'],
          ['Passphrase', 'An optional extra secret some wallets add to the seed. Lose it and the seed alone will not restore the same wallet.'],
        ),
        example(
          'A simple beginner routine',
          'Write the words by hand on paper, in order, with no digital copy. Store the paper somewhere private and dry. Make a second copy in a different trusted location. Before storing real value, restore the wallet once from the paper to prove the backup works.',
        ),
        warn(
          'Never type your seed into a website',
          'No legitimate website, wallet update, giveaway or support conversation requires your seed phrase. A site that asks for it is stealing the wallet.',
        ),
        tip(
          'Start small',
          'Practise with an amount you can afford to lose. A restore you have actually performed teaches more than ten articles about backups.',
        ),
        reflect(
          'Where would a backup be safe from theft, and also safe from being lost? Those two requirements pull in opposite directions — how would you balance them?',
        ),
      ],
    },
  ],
}
