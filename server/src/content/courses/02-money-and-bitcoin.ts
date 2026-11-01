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

export const moneyAndBitcoin: CourseBundle = {
  course: {
    slug: '02-money-and-bitcoin',
    title: 'Money and Bitcoin',
    description:
      'What money is for, how scarcity and inflation work, and why decentralisation is a trade-off rather than a slogan.',
    level: 'Beginner',
    order: 2,
    estimatedMinutes: 14,
    modules: [{ slug: 'what-money-does', title: 'What money does', order: 1 }],
  },
  lessons: [
    {
      slug: 'money-three-jobs',
      courseSlug: '02-money-and-bitcoin',
      moduleSlug: 'what-money-does',
      title: 'The three jobs of money',
      summary:
        'Medium of exchange, unit of account, store of value — and why one money rarely does all three perfectly.',
      order: 1,
      minutes: 7,
      objectives: [
        'Name the three functions of money.',
        'Explain why a currency can be good at one function and weak at another.',
        'Describe how this applies to both mobile money and Bitcoin.',
      ],
      sections: [
        p(
          'Economists usually describe money by what it does rather than what it is: it is a medium of exchange, a unit of account, and a store of value. The three jobs pull in different directions.',
        ),
        list(
          'Medium of exchange: something people accept for goods and services.',
          'Unit of account: a common measure for prices, wages and debts.',
          'Store of value: something that holds purchasing power over time.',
        ),
        p(
          'Mobile money is excellent as a medium of exchange in its home market: it is accepted, familiar and fast. It can be a weaker store of value if the local currency loses purchasing power. Bitcoin is designed to be scarce and transferable, but its price is volatile, which makes it a difficult unit of account for daily pricing.',
        ),
        terms(
          ['Medium of exchange', 'What people use to pay for things.'],
          ['Unit of account', 'The common measure used to quote prices.'],
          ['Store of value', 'Something that preserves purchasing power over time.'],
          ['Volatility', 'How much a price moves over time.'],
        ),
        example(
          'A market stall',
          'Prices at a market are quoted in the local currency because customers and sellers share it as a unit of account. If prices were quoted in bitcoin, a seller would have to re-price constantly as the exchange rate moved. That is a practical problem, not a moral one.',
        ),
        note(
          'No perfect money',
          'Every form of money trades off convenience, stability and control. Understanding the trade-offs is more useful than looking for a perfect one.',
        ),
        reflect(
          'Which of the three functions does your everyday money do best? Which does it do worst?',
        ),
      ],
    },
    {
      slug: 'money-scarcity',
      courseSlug: '02-money-and-bitcoin',
      moduleSlug: 'what-money-does',
      title: 'Scarcity and inflation, without the hype',
      summary:
        'What scarcity means, how inflation erodes purchasing power, and why a fixed supply is not the whole story.',
      order: 2,
      minutes: 7,
      objectives: [
        'Explain scarcity and inflation in plain language.',
        'Distinguish a fixed supply from stable purchasing power.',
        'Identify one benefit and one cost of a fixed-supply money.',
      ],
      sections: [
        p(
          'Scarcity means there is a limit on how much of something can exist. Bitcoin’s rules cap issuance at 21 million units. That cap is enforced by the network, not by a promise from an organisation.',
          'Inflation is a general rise in prices. It means each unit of currency buys less than it did. If your income rises more slowly than prices, your purchasing power falls even though the number in your account may be rising.',
        ),
        h('Fixed supply is not the same as stable value'),
        p(
          'A fixed supply does not guarantee that the price of bitcoin in your local currency will be stable. Demand can change faster than supply, and speculation moves prices sharply. Scarcity may support value over long periods; it does not protect you next week.',
        ),
        terms(
          ['Scarcity', 'A limited supply of something.'],
          ['Inflation', 'A general rise in prices, reducing what each unit of money can buy.'],
          ['Purchasing power', 'How much real goods and services money can buy.'],
        ),
        example(
          'The same basket, two years later',
          'A basket of goods that costs 1,000 units today may cost more next year. The number of units is higher; the goods are the same. That difference is what inflation measures.',
        ),
        tip(
          'Ask what is fixed',
          'When someone says a money is "sound", ask: fixed in what? Supply, purchasing power, and trust are three different things, and no system fixes all three at once.',
        ),
        note(
          'This is not investment advice',
          'Understanding scarcity does not tell you what price bitcoin will reach. Nobody knows that, and anyone who claims to is guessing.',
        ),
        reflect(
          'If prices doubled but your income also doubled, would you be better off, worse off, or the same? What does that tell you about measuring inflation?',
        ),
      ],
    },
  ],
}
