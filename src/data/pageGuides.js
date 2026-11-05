// "About this tool" guides shown at the bottom of the AI Playground pages
// (src/components/PageGuide.jsx) and written into their pre-rendered HTML
// (scripts/prerender.mjs), so visitors and search engines get a plain
// explanation of what each tool does, who it's for and how it works.
// Keys match PAGE_META in src/data/pageMeta.js (or a Data Atlas dataset id).

export const PAGE_GUIDES = {
  playground: {
    title: 'About the AI Playground',
    paragraphs: [
      'The AI Playground is a set of free, practical tools for people who lead AI work: Chief AI Officers, CIOs, product and transformation leaders, and the teams around them. Each tool turns a common AI leadership question into a structured exercise you can finish in minutes.',
      'Some tools are public and need no account, such as the Certification Navigator, the Data Atlas and the AI Time Capsule. Others save private work to your account, such as CAIO Compass assessments and Vendor Portfolio maps. Each tool states its data boundary before you start.',
      'Every tool has its own discussion room in the Playground Community, and a "Help shape" button for requesting features. Member requests decide what gets built next.',
    ],
    faqs: [
      { q: 'Are the AI Playground tools free?', a: 'Yes. All tools are free to use. Some need a free CAIO Forum account so your work can be saved privately.' },
      { q: 'Who are the tools for?', a: 'Leaders responsible for AI strategy and adoption, and anyone preparing for those roles. They are designed for decisions, not for writing code.' },
      { q: 'How are new tools chosen?', a: 'From member requests and discussions. Use "Help shape" on any tool card to describe the problem you want solved.' },
    ],
  },
  playgroundCommunity: {
    title: 'About the Playground Community',
    paragraphs: [
      'The Playground Community is where members discuss the AI Playground tools. Each tool has its own room for suggestions, questions and lessons learned, and a general room covers ideas for new tools.',
      'Posts here work like forum posts: anyone can read them, and signed-in members with a verified email can post, comment and vote.',
    ],
    faqs: [
      { q: 'What should I post here?', a: 'A suggestion for improving a tool, a question about using one, or something you learned from applying it to a real decision.' },
      { q: 'Do my posts influence the roadmap?', a: 'Yes. Suggestions and "Help shape" requests are reviewed regularly and shape what gets built next.' },
      { q: 'Can I discuss AI topics unrelated to the tools?', a: 'General AI leadership discussions belong in the main forum categories: Strategy, Concepts, Discussion, Ethics and Links.' },
    ],
  },
  buildVsBuy: {
    title: 'About the Build vs. Buy Decision Studio',
    paragraphs: [
      'The Build vs. Buy Decision Studio helps you decide whether an AI capability should be built in-house, bought from a vendor, or delivered as a hybrid. You answer nine questions about the initiative, covering factors such as strategic differentiation, time to value, security and assurance, and internal capability.',
      'Each answer is scored against a transparent rubric, so you can see why the tool leans toward Build, Buy or Hybrid. When the options are too close to call, or the business case is not clear yet, it says so instead of forcing a recommendation.',
      'An optional total-cost-of-ownership comparison lets you put rough up-front and yearly costs side by side for each path.',
    ],
    faqs: [
      { q: 'How long does a decision take?', a: 'Most decisions take five to ten minutes. You need a basic understanding of the initiative, its timeline and its risk level.' },
      { q: 'Is the recommendation final?', a: 'No. It is a structured starting point for a discussion with your team, showing which factors push toward each option.' },
      { q: 'Are my answers saved?', a: 'If you are signed in, your decisions are saved privately to your account so you can revisit them.' },
    ],
  },
  caioCompass: {
    title: 'About CAIO Compass',
    paragraphs: [
      'CAIO Compass is an AI maturity assessment for organizations. It looks at seven areas: vision, strategy, metrics, governance, people, processes and technology, including your operating model, data foundation and AI delivery lifecycle.',
      'After you answer, it shows where your organization is strongest and weakest and suggests a focused 90-day starting point. You can repeat the assessment later to track progress.',
    ],
    faqs: [
      { q: 'Who should take the assessment?', a: 'Anyone responsible for AI adoption, such as a Chief AI Officer, CIO or transformation lead. It works best when you answer for the organization as it is today, not as planned.' },
      { q: 'Is my assessment private?', a: 'Yes. Assessments are saved to your account and are not shared with other members.' },
      { q: 'Why do I need to sign in?', a: 'So your results can be saved and compared over time. Accounts are free.' },
    ],
  },
  vendorPortfolio: {
    title: 'About the Vendor Portfolio Mapper',
    paragraphs: [
      'The Vendor Portfolio Mapper is a free, open-source workspace for startups and small teams to take stock of the software they pay for. You list your tools, confirm AI-generated profiles of what each one does, and see where capabilities may overlap.',
      'The overlaps are hypotheses, not verdicts: they are a starting point for renewal conversations, consolidation decisions and budget reviews. Your portfolio is private to your account.',
    ],
    faqs: [
      { q: 'What does "overlap" mean here?', a: 'Two or more tools that appear to offer the same capability, such as two products that both handle e-signatures. You decide whether the overlap is real.' },
      { q: 'Where do the capability profiles come from?', a: 'They are drafted with AI from a shared catalog of common software products, and you confirm or correct them for your company.' },
      { q: 'Is my vendor list shared?', a: 'No. Your portfolio is visible only to you.' },
    ],
  },
  certifications: {
    title: 'About the Certification Navigator',
    paragraphs: [
      'The Certification Navigator is a catalog of verified professional certifications across cloud, AI, cybersecurity, finance, Agile, education, operations and more. Each entry shows the issuing authority, level, requirements and cost, with a link to the official source.',
      'You can compare certifications side by side, and signed-in members can generate a suggested certification pathway for a target role and keep a personal plan.',
      'Members can suggest certifications that are missing and report outdated details. Suggestions are reviewed before they are added.',
    ],
    faqs: [
      { q: 'How are certifications verified?', a: 'Each entry links to the issuing organization’s official page, and member reports of outdated details are reviewed.' },
      { q: 'Can I get a recommended path for my career?', a: 'Yes. Signed-in members can build a pathway for a target role and domain. A limited number of free pathway requests are available each day.' },
      { q: 'Is a certification missing?', a: 'Use the suggestion form on the Certification Navigator to propose it.' },
    ],
  },
  dataAtlas: {
    title: 'About the Data Atlas',
    paragraphs: [
      'The Data Atlas turns public datasets into interactive maps and charts you can explore directly in the browser. Every figure is traceable to its original source, which is cited on each dataset page.',
      'New datasets are added over time. The first covers every public school in the United States, combined with enrollment, staffing and neighborhood economic data.',
    ],
    faqs: [
      { q: 'Where does the data come from?', a: 'From official public sources, such as the National Center for Education Statistics and the US Census Bureau. Each dataset lists its sources and years.' },
      { q: 'Do I need an account?', a: 'No. The Data Atlas is free to explore without signing in.' },
      { q: 'Can I suggest a dataset?', a: 'Yes. Use "Help shape" on the Data Atlas card in the AI Playground.' },
    ],
  },
  'us-public-schools': {
    title: 'About this map',
    paragraphs: [
      'This map shows every public school in the 2024–25 NCES Common Core of Data directory, joined to 2022–23 enrollment, staffing, free and reduced-price lunch eligibility, and student demographics. It adds neighborhood economics from NCES’s school neighborhood poverty estimates and the US Census Bureau’s American Community Survey.',
      'You can filter by state or territory and by place, color schools by different measures, and find any school to see its figures. All numbers come from the cited public sources; nothing is estimated by AI.',
    ],
    faqs: [
      { q: 'Why are some figures from different years?', a: 'Each source publishes on its own schedule. The map uses the latest year available from each one and labels the year.' },
      { q: 'What does the neighborhood income figure mean?', a: 'It is an estimate of the income-to-poverty ratio of families living around the school, not the income of the school’s own students.' },
      { q: 'Can I download the data?', a: 'The underlying data is public. The sources are linked on this page, so you can download the originals.' },
    ],
  },
  timeCapsule: {
    title: 'About the AI Time Capsule',
    paragraphs: [
      'The AI Time Capsule collects predictions about what AI will achieve, and by when. There is one canvas for each year from 2027 to 2040, and each prediction claims one pixel on the canvas of the year it should come true by.',
      'Predictions are sealed: anyone can see a pixel’s topic, who placed it and when, but the text stays private to its author until the canvas’s year ends. On the following New Year’s Day, the whole canvas is revealed and AI reviews which predictions came true.',
      'Each member can make three new predictions per calendar year, and each one is dated, so early calls get credit.',
    ],
    faqs: [
      { q: 'When can I see other people’s predictions?', a: 'When the canvas is revealed: midnight UTC on January 1 after its year. Until then you can see topics, authors and dates.' },
      { q: 'Why can’t I predict something for this year?', a: 'Each canvas closes on December 31 of the year before, so every prediction is made at least a full year ahead.' },
      { q: 'Can I change my prediction?', a: 'You can edit or delete it for 24 hours after placing it. After that it is locked.' },
    ],
  },
};
