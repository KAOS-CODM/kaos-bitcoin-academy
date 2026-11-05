import { q, type QuizSeed } from '../types.js'

export const stayingSafeQuizzes: QuizSeed[] = [
  {
    slug: 'safe-scams-check',
    kind: 'lesson',
    courseSlug: '07-staying-safe',
    lessonSlug: 'safe-scams',
    title: 'Check: how beginner scams work',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'Which emotional levers do scammers use?',
        [
          'Fear, urgency and opportunity',
          'Boredom, generosity and patience',
          'Confirmation, finality and privacy',
        ],
        0,
        'The lesson names fear, urgency and opportunity as the levers that push people to act quickly.',
      ),
      q(
        'q2',
        'How should you verify a suspicious request?',
        [
          'Through the link in the message',
          'Through a channel you chose yourself, such as the official app or a saved number',
          'By asking the person who contacted you to confirm they are real',
        ],
        1,
        'Verification must use a channel you chose independently, not the one the attacker supplied.',
      ),
    ],
  },
  {
    slug: 'safe-checklist-check',
    kind: 'lesson',
    courseSlug: '07-staying-safe',
    lessonSlug: 'safe-checklist',
    title: 'Check: a checklist before you send',
    passingScore: 67,
    questions: [
      q(
        'q1',
        'Why use a small test payment for a new destination?',
        [
          'It makes the final payment free',
          'It removes the need to check the address',
          'It reveals address or malware problems at a low cost',
        ],
        2,
        'A small test confirms the destination and process before a larger amount is at risk.',
      ),
      q(
        'q2',
        'What should you do if you suspect a compromise?',
        [
          'Move remaining funds to a new wallet you control, change passwords and revoke sessions',
          'Share your seed phrase with the first person who offers help',
          'Wait quietly and hope the attacker stops',
        ],
        0,
        'The lesson recommends moving funds from a trusted device and securing accounts, without accepting help from someone who contacted you first.',
      ),
    ],
  },
  {
    slug: 'staying-safe-assessment',
    kind: 'course',
    courseSlug: '07-staying-safe',
    title: 'Staying Safe assessment',
    passingScore: 80,
    questions: [
      q(
        'q1',
        'Which sequence describes the structure of a typical beginner scam?',
        [
          'Backup, restore, confirm, mine and close',
          'Contact, hook, pressure, request, exit',
          'Invoice, expiry, route, settle and reopen',
        ],
        1,
        'The lesson lays out contact, hook, pressure, request and disappearance.',
      ),
      q(
        'q2',
        'Someone tells you not to discuss an opportunity with family or your bank. Why is that a red flag?',
        [
          'Banks are always wrong about how bitcoin works',
          'Family members cannot understand digital money',
          'Trusted people would ask exposing questions',
        ],
        2,
        'Secrecy is used to isolate you from people who would question the request.',
      ),
      q(
        'q3',
        'A reply to your public question offers support and asks you to move to a private chat. What should you do?',
        [
          'Verify through an official app or saved contact',
          'Trust the speed and the helpful tone of the reply',
          'Send a small verification payment before deciding',
        ],
        0,
        'A fast, helpful reply can be impersonation. Verify independently, not through the contact.',
      ),
      q(
        'q4',
        'Which is part of the pre-send checklist?',
        [
          'Skip the test payment to save fees',
          'Confirm recipient, amount, network and address',
          'Send the largest amount first to test the relationship',
        ],
        1,
        'The checklist covers recipient identity, purpose and amount, network and address, testing, and whether you can afford the loss.',
      ),
      q(
        'q5',
        'What should you do if an answer on the pre-send checklist is unclear?',
        [
          'Send a small test and ignore the unclear answer',
          'Ask the person who contacted you to confirm',
          'Stop and resolve it before sending',
        ],
        2,
        'The lesson says to stop if any answer is unclear: a delayed payment is recoverable, but a sent payment is not.',
      ),
    ],
  },
]
