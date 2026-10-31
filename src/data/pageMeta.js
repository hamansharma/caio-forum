// Titles, descriptions and canonical paths for the site's indexable pages, in one
// place. The pages use them at runtime (usePageMeta) and scripts/prerender.mjs
// writes them into each page's static HTML, so the two can't drift apart.
// `heading` and `intro` are the visible text shown to crawlers without JavaScript.

export const PAGE_META = {
  home: {
    path: '/',
    title: 'CAIO Forum | AI Leadership, Strategy & Technology Community',
    description: 'Join practical discussions on AI leadership, strategy, technology, and responsible adoption. Explore ideas, projects, and free tools from the CAIO community.',
    heading: 'AI leadership discussions',
    intro: 'Practical ideas on AI strategy, technology, governance, and responsible adoption.',
  },
  playground: {
    path: '/playground',
    title: 'AI Playground | Practical AI Tools & Experiments',
    description: 'Explore practical AI tools, experiments, and decision-support projects from CAIO Leadership Lab, including certification planning and vendor portfolio mapping.',
    heading: 'AI Playground',
    intro: 'A home for practical AI experiments: tools worth testing, projects worth sharing, and ideas that turn into better decisions.',
  },
  playgroundCommunity: {
    path: '/playground/community',
    title: 'AI Playground Community | Ideas, Questions & Learnings',
    description: 'Discuss AI Playground tools, suggest experiments, ask practical questions, and share what you learned with the CAIO community.',
    heading: 'Help shape the AI Playground',
    intro: 'Suggest new tools, ask questions, and share practical learnings from every AI Playground experiment.',
  },
  certifications: {
    path: '/certifications',
    title: 'Certification Navigator | Compare Professional Certifications',
    description: 'Explore and compare professional certifications across cloud, AI, cybersecurity, finance, Agile, education, operations, and more before you invest.',
    heading: 'Certification Navigator',
    intro: 'Explore verified certifications across technology, finance, insurance, teaching, quality, and more, organized by level, requirements, cost, and authority.',
  },
  caioCompass: {
    path: '/playground/caio-compass',
    title: 'CAIO Compass | AI Maturity Assessment & Roadmap',
    description: 'Assess your organization’s AI maturity across strategy, data, operating model, governance, and delivery—then identify practical next steps.',
    heading: 'CAIO Compass',
    intro: 'Assess AI maturity across vision, strategy, metrics, governance, people, processes, and technology, then get a focused 90-day starting point.',
  },
  buildVsBuy: {
    path: '/playground/build-vs-buy',
    title: 'Build vs. Buy Decision Studio | CAIO Leadership Lab',
    description: 'Use a structured nine-factor assessment to evaluate whether an AI capability should be built, bought, or delivered as a hybrid solution.',
    heading: 'Build vs. Buy Decision Studio',
    intro: 'Use a transparent nine-factor rubric to decide whether an AI initiative should be built, bought, or delivered as a hybrid solution.',
  },
  vendorPortfolio: {
    path: '/playground/vendor-portfolio',
    title: 'Vendor Portfolio Mapper | Free Open-Source SaaS Portfolio Tool',
    description: 'A free, open-source workspace for startups and small teams to inventory software, identify potential overlap, and prepare better renewal decisions.',
    heading: 'Vendor Portfolio Mapper',
    intro: 'Add the tools your company uses, confirm AI-generated capability profiles, and identify overlap hypotheses before a renewal conversation.',
  },
  dataAtlas: {
    path: '/playground/data-atlas',
    title: 'Data Atlas | Explore Public Datasets | CAIO Forum',
    description: 'Explore public datasets through interactive maps and charts in the CAIO Forum AI Playground, with every figure traceable to its source.',
    heading: 'Data Atlas',
    intro: 'Public datasets you can explore directly: interactive maps and charts with every figure traceable to its source.',
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy | CAIO Forum',
    description: 'How CAIO Forum and the AI Playground collect, use, share, and protect your information.',
    heading: 'Privacy Policy',
    intro: 'This policy explains what information CAIO Forum collects when you use caioleadership.com and how that information is used.',
  },
  terms: {
    path: '/terms',
    title: 'Terms of Service | CAIO Forum',
    description: 'The terms that govern your use of CAIO Forum, the AI assistant, and the AI Playground tools.',
    heading: 'Terms of Service',
    intro: 'These terms govern your use of CAIO Forum, including the forum, the AI assistant, and the AI Playground tools.',
  },
};
