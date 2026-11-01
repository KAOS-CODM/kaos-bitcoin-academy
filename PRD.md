KAOS Bitcoin Academy

Product Requirements Document & Technical Specification

Document status: Initial baseline
Version: 1.0
Date: October 30, 2026
Product owner: KAOS / KAOS-CODM
Hackathon: Dakar Bitcoin Hack by BTrust
Submission deadline: November 20, 2026
Product category: Bitcoin Education / EdTech / Fintech
Access model: Free educational platform
Geographic focus: Primarily African beginners
Working tagline: Understand Bitcoin. Experience the Network.

---

1. Executive Summary

KAOS Bitcoin Academy is a free, interactive Bitcoin education platform designed to help people with little or no prior knowledge understand Bitcoin, its underlying technology, and its practical applications.

The platform combines structured educational content, interactive technical demonstrations, AI-assisted learning, gamification, and practical Bitcoin/Lightning wallet experiences.

Its primary objective is to make Bitcoin education approachable to African beginners without sacrificing technical accuracy.

Rather than presenting Bitcoin as a collection of technical definitions, the platform teaches through progressive learning, experimentation, real-world scenarios, and guided practical exercises.

Product proposition

Take someone from knowing absolutely nothing about Bitcoin to understanding how it works, recognizing its risks, and navigating its ecosystem.

Core experience

- Learn: Structured courses and lessons.
- Explore: Interactive Bitcoin and blockchain demonstrations.
- Ask: AI-powered educational assistance.
- Practice: Quizzes, exercises and challenges.
- Experience: Guided Bitcoin and Lightning wallet interactions.

2. Problem Statement

Bitcoin education remains difficult for many beginners because:

1. Educational resources frequently assume prior financial or technical knowledge.
2. Technical explanations can be unnecessarily complicated.
3. Many learning resources emphasize passive reading rather than practical experimentation.
4. Learners struggle to connect Bitcoin concepts to familiar financial situations.
5. Beginners may encounter misleading information, scams and unsafe practices when attempting to use Bitcoin.

These challenges are particularly relevant to African learners who may have different levels of financial literacy, digital access, internet connectivity and familiarity with cryptocurrency.

Proposed solution

KAOS Bitcoin Academy will provide a beginner-first educational environment that combines accessible explanations, visual demonstrations, interactive learning and guided practical experiences.

3. Product Vision

Make Bitcoin understandable and accessible to anyone willing to learn.

The platform should be approachable to a complete beginner while offering enough depth to remain useful to students, everyday users, technology enthusiasts and developers.

Product principles

1. Beginner-first: No previous Bitcoin knowledge should be required.
2. Learn by doing: Concepts should be reinforced through interaction.
3. Accuracy before simplicity: Simplification must not introduce technical inaccuracies.
4. Security awareness: Safety education must accompany practical wallet usage.
5. Accessibility: Design for mobile devices, limited bandwidth and different levels of digital literacy.
6. Open education: Core educational features remain free.
7. Progressive complexity: Advanced subjects become available as learners develop their understanding.

4. Target Users

Primary audience

Bitcoin beginners

People who have little or no understanding of Bitcoin and need a guided introduction.

Typical questions include:

- What exactly is Bitcoin?
- Is Bitcoin physical or digital?
- Who creates Bitcoin?
- How does it work without a central bank?
- What is a Bitcoin wallet?
- How do transactions happen?
- Can Bitcoin be used in Africa?
- What risks should I understand?

Secondary audiences

Audience| Needs
University students| Technical understanding and structured learning
Everyday users| Practical knowledge and wallet literacy
Technology enthusiasts| Deeper exploration of Bitcoin infrastructure
Developers| Protocol concepts and development resources

The platform will initially optimize for beginners rather than attempting to serve all four audiences equally.

5. Product Scope

5.1 Core modules

Module A: Learning Management

Purpose: Deliver structured Bitcoin educational content.

Requirements:

- Course catalogue.
- Learning paths.
- Lessons divided into manageable sections.
- Text, diagrams and illustrations.
- Knowledge checks.
- Lesson completion tracking.
- Course progress indicators.
- Resume learning functionality.

Module B: Interactive Bitcoin Playground

Purpose: Help learners understand technical concepts through experimentation.

Initial simulations:

1. Wallet creation using fictional demonstration data.
2. Public and private key relationships.
3. Bitcoin transaction construction.
4. Transaction broadcasting and confirmation concepts.
5. Blockchain block formation.
6. Mining and proof-of-work demonstrations.

All simulated activities must be clearly labelled as simulations.

No simulated transaction may be represented as an actual Bitcoin network transaction.

Module C: KAOS AI Tutor

Purpose: Provide contextual educational assistance.

Requirements:

- Conversational interface.
- Context-aware lesson assistance.
- Beginner-friendly explanations.
- Alternative explanations for difficult concepts.
- Examples based on African financial situations.
- Follow-up questions.
- Practice question generation.
- Clear uncertainty handling.

The AI tutor should use curated educational material as its primary knowledge source.

It must not invent transaction information, financial advice, protocol specifications or wallet security guarantees.

Module D: Practice and Gamification

Purpose: Encourage learning progression and knowledge retention.

Requirements:

- Multiple-choice quizzes.
- Scenario-based questions.
- Immediate answer feedback.
- XP points.
- Achievement badges.
- Course completion tracking.
- Learning milestones.

Gamification must reward demonstrated understanding, not merely time spent on the platform.

Module E: Bitcoin and Lightning Wallet Experience

Purpose: Connect theoretical education to practical Bitcoin usage.

Requirements:

- Explain wallet functionality.
- Introduce receiving and sending payments.
- Explain Lightning invoices.
- Explain payment authorization.
- Display payment outcomes.
- Provide guided safety instructions.
- Integrate an actual Bitcoin/Lightning wallet implementation.

The integration strategy will be selected after evaluating NWC and LNbits.

No user seed phrases or private keys will be collected.

6. Curriculum Structure

The initial curriculum will contain eight courses.

Course| Learning objectives
01. Bitcoin 101| Understand Bitcoin and why it exists
02. Money and Bitcoin| Understand money, scarcity, inflation and decentralization
03. How Bitcoin Works| Understand blockchain, mining, nodes and transactions
04. Bitcoin Wallets| Understand addresses, private keys and seed phrases
05. Using Bitcoin| Understand sending, receiving, fees and confirmations
06. Lightning Network| Understand payment channels and Lightning transactions
07. Staying Safe| Recognize scams, phishing, custody risks and common mistakes
08. Beyond Bitcoin| Explore Nostr, applications and developer opportunities

Each course should contain:

- Course introduction.
- Learning objectives.
- Lessons.
- Relevant illustrations or demonstrations.
- Knowledge checks.
- Course assessment.
- Completion status.

Content requirements

Educational content must:

- Use clear, accessible English.
- Introduce technical terminology gradually.
- Include African examples where appropriate.
- Distinguish Bitcoin from other cryptocurrencies.
- Explain both advantages and limitations.
- Avoid investment promises and speculative claims.
- Include safety guidance wherever relevant.

7. Functional Requirements

ID| Requirement| Priority
FR-001| Users can register and authenticate| P0
FR-002| Users can access the course catalogue| P0
FR-003| Users can view lessons| P0
FR-004| Users can complete lessons| P0
FR-005| Users can complete quizzes| P0
FR-006| Learning progress is persisted| P0
FR-007| Users can access the Bitcoin playground| P0
FR-008| Users can interact with the AI tutor| P0
FR-009| Users can connect a compatible Lightning wallet| P0
FR-010| Users can complete a guided Lightning payment| P0
FR-011| Users can view their learning dashboard| P0
FR-012| Users can earn XP and achievements| P1
FR-013| Users can access multiple learning paths| P1
FR-014| Users can receive completion certificates| P2
FR-015| Users can access community learning features| P2
FR-016| Developers can access advanced technical courses| P2

P0 represents the hackathon delivery commitment. P1 and P2 must not delay the working MVP.

8. User Experience Requirements

8.1 Onboarding

A first-time visitor should be able to understand the platform's purpose immediately.

Expected flow:

1. Visit landing page.
2. Understand what the platform teaches.
3. Register or begin the available introductory experience.
4. Access the beginner learning path.
5. Start the first lesson.

Onboarding should not require cryptocurrency knowledge.

8.2 Learner dashboard

The dashboard should provide:

- Welcome message.
- Current learning path.
- Course progress.
- Continue learning action.
- Recommended next lesson.
- Recent achievements.
- AI tutor access.

8.3 Mobile accessibility

The platform must:

- Work on common Android smartphones.
- Support responsive layouts.
- Minimize unnecessary network requests.
- Avoid oversized media.
- Provide readable text and accessible controls.
- Handle temporary network failures gracefully.

A lightweight PWA is preferred.

9. Technical Specification

9.1 Proposed architecture

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Progressive Web App support

Backend

- Node.js
- Express.js
- REST API
- Authentication middleware
- Input validation
- Centralized error handling

Database

- MongoDB
- Mongoose

AI

- OpenRouter or another compatible provider.
- Server-side AI requests.
- Curated educational knowledge base.
- Contextual lesson retrieval.

Bitcoin infrastructure

- Nostr Wallet Connect evaluation.
- LNbits evaluation.
- Compatible Lightning wallet.
- Controlled testing environment.

9.2 High-level architecture

                 LEARNER
                    |
                    v
          REACT + TYPESCRIPT
                    |
                    v
             EXPRESS API
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
     MongoDB     AI Tutor    Learning Engine
        |           |           |
        |           |           |
        +-----------+-----------+
                    |
                    v
             WALLET SERVICE
                    |
           +--------+--------+
           |                 |
           v                 v
          NWC              LNbits
           |                 |
           +--------+--------+
                    |
                    v
             LIGHTNING NETWORK

The diagram represents the alternatives under evaluation, not a requirement to deploy both.

The wallet service must isolate payment functionality from the general learning API.

9.3 Suggested project structure

kaos-bitcoin-academy/
│
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── features/
│       │   ├── auth/
│       │   ├── courses/
│       │   ├── lessons/
│       │   ├── playground/
│       │   ├── tutor/
│       │   ├── quizzes/
│       │   ├── progress/
│       │   └── wallet/
│       ├── hooks/
│       ├── layouts/
│       ├── pages/
│       ├── services/
│       ├── types/
│       └── utils/
│
├── server/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       │   ├── ai/
│       │   ├── learning/
│       │   └── wallet/
│       ├── validators/
│       ├── utils/
│       └── app.ts
│
├── docs/
│   ├── PRD.md
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   └── WALLET-DECISION.md
│
├── README.md
└── .env.example

This is a proposed organization. Existing repository conventions should be inspected before implementation.

10. Initial Data Models

The following are logical entities. Exact schemas and relationships will be finalized during implementation.

User

- id
- email
- passwordHash
- displayName
- createdAt
- updatedAt

Course

- id
- title
- description
- level
- modules
- published
- createdAt

Lesson

- id
- courseId
- title
- content
- order
- learningObjectives
- estimatedDuration

UserProgress

- id
- userId
- courseId
- completedLessons
- completionPercentage
- lastAccessedAt

Quiz

- id
- lessonId
- questions
- passingScore

QuizAttempt

- id
- userId
- quizId
- score
- completedAt

Achievement

- id
- title
- description
- criteria
- points

UserAchievement

- id
- userId
- achievementId
- earnedAt

AIConversation

- id
- userId
- context
- messages
- createdAt

Wallet connection metadata should be handled separately from ordinary learning records. Sensitive connection credentials must never be stored as ordinary unencrypted user fields.

11. API Specification

Proposed REST endpoints:

Authentication

POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

Courses

GET    /api/courses
GET    /api/courses/:courseId
GET    /api/courses/:courseId/lessons
GET    /api/lessons/:lessonId

Progress

GET    /api/progress
GET    /api/progress/:courseId
POST   /api/progress/lessons/:lessonId/complete

Quizzes

GET    /api/quizzes/:quizId
POST   /api/quizzes/:quizId/attempts
GET    /api/quizzes/:quizId/results

AI Tutor

POST   /api/tutor/chat
GET    /api/tutor/conversations
GET    /api/tutor/conversations/:id

Wallet

POST   /api/wallet/connect
GET    /api/wallet/status
POST   /api/wallet/invoices
POST   /api/wallet/payments
GET    /api/wallet/payments/:paymentId
DELETE /api/wallet/connect

Wallet endpoints are subject to the final integration design. The backend must validate ownership, authorization, invoice details and payment status.

Payment requests must never be treated as successful merely because an API request returned successfully. The actual wallet/network result must be verified.

12. Wallet Integration Decision

This is a major architectural decision and must be tested before selection.

Option A: Nostr Wallet Connect

NWC provides a standardized way for applications to communicate with compatible Lightning wallets.

Potential advantages:

- Users can connect an existing compatible wallet.
- Payment authorization remains with the wallet.
- Avoids requiring the academy to operate its own wallet for every learner.
- Fits naturally into the Bitcoin and Nostr ecosystem.

Potential challenges:

- Wallet compatibility varies.
- Connection setup can be unfamiliar to beginners.
- Connection credentials require careful handling.
- Relay availability and payment response handling must be tested.

Option B: LNbits

LNbits provides Lightning wallet infrastructure, accounts and REST APIs.

Potential advantages:

- Programmatic invoice generation.
- Payment operations through an API.
- Wallet/account separation.
- Useful for controlled educational demonstrations.
- Existing API documentation and developer resources.

Potential challenges:

- Infrastructure hosting and maintenance.
- API credential protection.
- Funding and backend configuration.
- Custodial implications when using a shared LNbits instance.

Evaluation criteria

Criterion| NWC| LNbits
Existing wallet connection| Core capability| Not its primary model
Backend integration| Protocol integration| REST API
Infrastructure operation| Compatible wallet and relay| LNbits instance and funding backend
Credential security| NWC connection secret| Wallet API credentials
Learner onboarding| Depends on wallet| Depends on deployment
Custody considerations| Depends on connected wallet| Shared instance operator can access funds
Hackathon suitability| To be validated| To be validated

Decision process

1. Verify both integrations independently.
2. Identify compatible wallets.
3. Establish a controlled testing environment.
4. Test invoice generation and payment authorization.
5. Verify payment status and failure handling.
6. Document security implications.
7. Select one implementation for the MVP.

Provisional preference: NWC for connecting learners' existing wallets, with LNbits as an alternative for controlled demonstrations.

This is not a final architectural decision.

Wallet security requirements

- Never request or store users' seed phrases.
- Never collect private keys.
- Never expose wallet secrets in frontend logs or analytics.
- Never expose LNbits administrative credentials to the browser.
- Use minimum necessary wallet permissions.
- Enforce spending limits where supported.
- Require explicit user authorization for payments.
- Use test environments where supported.
- Clearly distinguish real payments from simulations.
- Never imply that a wallet integration makes a user immune to financial loss.

13. Security Requirements

Security is a first-class requirement, not a final polishing task.

Authentication

- Secure password hashing.
- Validated authentication requests.
- Protected user routes.
- Secure session/token handling.
- Rate limiting.

Application security

- Server-side validation.
- Safe error responses.
- Appropriate CORS restrictions.
- Environment-based secrets.
- No hardcoded API credentials.
- Protection against common injection and cross-site scripting attacks.

AI security

- API keys remain server-side.
- Input size limits.
- Request rate limits.
- No unnecessary personal information in prompts.
- Treat learner-provided content as untrusted input.
- Prevent the tutor from presenting unverified financial instructions as facts.

Payment security

- Wallet operations are isolated.
- Payment amounts and invoices are validated.
- Payment status is verified.
- No automatic payment without explicit authorization.
- No logging of sensitive connection credentials.

Privacy

- Collect only necessary learner information.
- Avoid personal information in application logs.
- Provide clear privacy information.
- Do not expose one user's learning records to another.

14. Acceptance Criteria

The MVP is accepted when the following conditions are demonstrably satisfied.

ID| Acceptance criterion| Verification
AC-001| A new learner can register and sign in| Functional test
AC-002| A learner can access published courses| Functional test
AC-003| Lessons display correctly on mobile| Responsive test
AC-004| Lesson completion is persisted| Database test
AC-005| Learners can submit quiz answers| Functional test
AC-006| Quiz results are calculated correctly| Unit test
AC-007| Progress updates after lesson completion| Integration test
AC-008| The Bitcoin playground supports its documented exercises| Demonstration
AC-009| Simulations are visibly distinguished from real transactions| UX review
AC-010| The AI tutor answers questions using educational context| Functional test
AC-011| The AI tutor handles unsupported questions safely| Negative test
AC-012| A compatible Lightning wallet can be connected| Integration test
AC-013| The platform can generate or handle a real Lightning payment request| Integration test
AC-014| A guided payment can be completed and verified| End-to-end test
AC-015| Payment failures are communicated accurately| Negative test
AC-016| Wallet secrets are not exposed in logs or frontend bundles| Security review
AC-017| The application is accessible through a public deployment| Deployment test
AC-018| The repository includes setup and architecture documentation| Documentation review

A feature must not be marked complete merely because its interface exists.

15. Non-Functional Requirements

Performance

- Responsive interactions on typical mid-range Android phones.
- Optimized image assets.
- Minimal unnecessary API calls.
- Graceful handling of slow network connections.

Reliability

- Clear loading states.
- Useful error messages.
- Safe handling of interrupted requests.
- Persistent learning progress.

Accessibility

- Readable typography.
- Adequate contrast.
- Keyboard-accessible controls.
- Clear language.
- Avoid reliance on color alone to communicate status.

Maintainability

- Modular frontend and backend.
- Consistent naming conventions.
- Documented API contracts.
- Reusable components.
- Environment-based configuration.
- Automated tests for critical functionality.

16. Out of Scope for the Hackathon MVP

The following are explicitly excluded from the initial delivery:

- Building a new Bitcoin wallet from scratch.
- Operating a cryptocurrency exchange.
- Holding user funds on behalf of learners.
- Investment recommendations.
- Trading functionality.
- Token issuance.
- Cryptocurrency speculation features.
- Full Nostr social networking.
- Complex instructor management.
- Paid subscriptions.
- Mobile application store publishing.
- Multiple-language localization.
- Production-scale Lightning infrastructure.

These may be reconsidered for future versions where appropriate.

17. Design Specification

Visual identity

Brand: KAOS Bitcoin Academy.

Design direction:

- Near-black backgrounds.
- Amber/gold accents.
- Clean typography.
- Technical illustrations.
- Friendly, approachable educational layouts.
- Responsive, mobile-first interface.

Suggested palette:

Purpose| Color
Background| #17140F
Primary accent| #F5B942
Secondary accent| #FDE68A
Primary text| #FFFFFF
Muted text| #A8A29E
Surface| #211E18

UX principles

The interface must feel educational rather than financial or trading-oriented.

Avoid:

- Dense trading dashboards.
- Excessive cryptocurrency jargon.
- Unnecessary animations.
- Overwhelming technical diagrams.
- Cluttered dashboards.

Prioritize:

- Clear learning progression.
- Friendly explanations.
- Visual demonstrations.
- Simple navigation.
- Obvious next actions.

18. Hackathon Development Roadmap

Period| Milestone| Deliverable
Oct 30 – Nov 2| Product foundation| Approved specification, architecture and wallet evaluation
Nov 3 – Nov 8| Learning core| Dashboard, lessons, quizzes, progress and simulator
Nov 9 – Nov 13| Integrations| AI tutor and Lightning wallet
Nov 14 – Nov 17| Stabilization| Responsive UX, security and end-to-end testing
Nov 18 – Nov 20| Submission| Deployment, documentation and presentation

Critical development rule

Wallet integration is a major dependency.

It must be validated early rather than postponed until the final days.

If one wallet approach proves impractical, use the alternative evaluation rather than sacrificing the entire MVP.

19. Testing Strategy

Unit testing

- Learning progress calculations.
- Quiz scoring.
- Input validation.
- Course completion logic.
- Payment state interpretation.

Integration testing

- Authentication and database.
- Course retrieval.
- Progress persistence.
- AI tutor requests.
- Wallet connection.
- Invoice creation and payment verification.

End-to-end testing

The primary demo journey:

1. Open the deployed application.
2. Register a learner.
3. Start Bitcoin 101.
4. Complete a lesson.
5. Take a quiz.
6. Explore a Bitcoin simulation.
7. Ask the AI tutor a question.
8. Connect a compatible Lightning wallet.
9. Complete a guided payment.
10. Verify the payment result.

Negative testing

- Invalid login credentials.
- Missing lesson data.
- Incorrect quiz submissions.
- AI provider failure.
- Wallet disconnection.
- Invalid invoices.
- Rejected payments.
- Network interruption.

20. Success Metrics

For the hackathon, prioritize measurable educational outcomes.

Suggested initial metrics:

- Number of registered learners.
- Number of learners starting Bitcoin 101.
- Introductory course completion rate.
- Quiz completion and performance.
- Playground interaction count.
- AI tutor usage.
- Successful wallet connection count.
- Verified Lightning payment demonstrations.

We should also evaluate whether learners understand key concepts before and after completing the introductory course.

Do not invent user reach or impact statistics in the final presentation. Report measured results or clearly label estimates.

21. Hackathon Deliverables

The submission package must include:

1. Public GitHub repository.
2. Accessible deployed MVP or demonstration video.
3. Product presentation.
4. README with setup instructions.
5. Architecture diagram.
6. Documented wallet integration.
7. Security considerations.
8. Demonstrable end-to-end user journey.
9. Future development roadmap.

Suggested three-minute presentation

Time| Presentation
0:00–0:30| The Bitcoin education problem
0:30–0:55| Introducing KAOS Bitcoin Academy
0:55–1:40| Beginner learning experience and playground
1:40–2:10| AI tutor demonstration
2:10–2:40| Lightning wallet demonstration
2:40–3:00| African impact, architecture and future vision

22. Future Roadmap

Following the hackathon:

Phase 2: Learning expansion

- More courses.
- Improved interactive demonstrations.
- Advanced learning paths.
- Better AI personalization.

Phase 3: African accessibility

- Additional African language support.
- More regional financial scenarios.
- Improved offline learning.
- Local educational partnerships.

Phase 4: Ecosystem integration

- Nostr integration.
- Developer learning environments.
- Community learning.
- Additional Bitcoin ecosystem tools.

23. Risks and Mitigations

Risk| Mitigation
Wallet integration complexity| Validate NWC and LNbits early
AI misinformation| Curated knowledge base and grounded responses
Limited development time| Strict P0 scope
Network instability| Lightweight design and graceful failures
Payment errors| Verify actual payment state
Security vulnerabilities| Least-privilege access and testing
Content quality| Review technical lessons before publication
Feature creep| Require explicit approval for scope changes

24. Initial Product Decisions Register

Decision| Status
Product name: KAOS Bitcoin Academy| Approved
KAOS ecosystem ownership| Approved
Primary audience: African beginners| Approved
Secondary audiences: students, users and developers| Approved
Learning experience: Hybrid| Approved
Free educational access| Approved
Wallet integration: NWC vs LNbits| Under evaluation
Frontend architecture| Proposed
Backend architecture| Proposed
Database| Proposed
AI provider| To be evaluated
Visual identity| Proposed

25. Definition of Done

The hackathon MVP is considered complete when:

- The public application works.
- A beginner can complete the introductory learning journey.
- Lessons and quiz progress persist.
- The Bitcoin playground provides functional educational demonstrations.
- The AI tutor works with contextual educational content.
- An actual Lightning wallet integration is operational.
- A guided payment can be completed and verified.
- Critical security checks pass.
- The repository and documentation are publicly accessible.
- A complete demonstration can be performed without relying on mock payment results.

---

Final Product Statement

KAOS Bitcoin Academy is a free, beginner-first Bitcoin education platform that makes Bitcoin understandable through structured learning, interactive experimentation, AI-assisted explanations and practical Lightning experiences.

Learn Bitcoin. Explore its technology. Understand its possibilities. Experience the network.

A KAOS product.

Final authority

The specification governs the implementation, not the other way around.

When uncertain, stop and ask the project owner.
