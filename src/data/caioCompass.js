export const compassDimensions = [
  ['vision', 'Vision', ['vision-shared-direction', 'vision-sponsorship', 'vision-communication'], ['How clearly is the organization’s AI direction understood?', 'What executive sponsorship exists for AI?', 'How is the AI ambition communicated to teams?']],
  ['strategy', 'Strategy', ['strategy-portfolio', 'strategy-business-case', 'strategy-funding'], ['How are AI opportunities selected and prioritized?', 'How are business cases for AI initiatives defined?', 'How is AI work funded?']],
  ['metrics', 'Metrics', ['metrics-outcomes', 'metrics-baselines', 'metrics-accountability'], ['How consistently are AI outcomes measured?', 'When do teams establish baselines for expected value?', 'Who owns realizing the value from deployed AI?']],
  ['governance', 'Governance', ['governance-policy', 'governance-risk', 'governance-accountability'], ['How mature are AI policies and standards?', 'How are AI risks reviewed before deployment?', 'How clear are accountability and escalation paths?']],
  ['people', 'People', ['people-capability', 'people-adoption', 'people-collaboration'], ['What AI capability exists across the organization?', 'How are employees prepared to use AI responsibly?', 'How effectively do business, data, technology, and risk teams collaborate?']],
  ['processes', 'Processes', ['processes-lifecycle', 'processes-production', 'processes-reuse'], ['How repeatable is the AI delivery lifecycle?', 'How are AI solutions monitored after launch?', 'How often are data, prompts, models, and patterns reused?']],
  ['technology', 'Technology', ['technology-platform', 'technology-data', 'technology-integration'], ['How ready is the technology environment for scalable AI?', 'How usable is data for priority AI use cases?', 'How readily can AI solutions be integrated into workflows?']],
].map(([id, label, ids, prompts]) => ({
  id,
  label,
  questions: ids.map((questionId, index) => ({ id: questionId, prompt: prompts[index] })),
}));

export const maturityLabels = ['Aware', 'Reactive', 'Proactive', 'Managed', 'Optimized'];

export const resultRoutes = {
  'transformation-operating-model': {
    title: 'Transformation operating model',
    reason: 'Your results indicate that the enterprise foundations for coordinated AI transformation need attention.',
    sourceLabel: 'AI Transformation Framework',
    sourceUrl: '/post/tmIjJVnIyixaoP3Iau1R',
    phases: [
      ['Days 1–30 · Align', ['Name an executive sponsor and define the AI ambition.', 'Create a cross-functional transformation cadence and decision rights.']],
      ['Days 31–60 · Prioritize', ['Rank use cases by business value, feasibility, risk, and owner.', 'Set measurable outcomes and a funded transformation roadmap.']],
      ['Days 61–90 · Mobilize', ['Launch a focused delivery squad around the highest-value use case.', 'Review capability, governance, and value progress with leadership.']],
    ],
  },
  'data-foundation': {
    title: 'Data foundation',
    reason: 'Data readiness or risk controls could limit safe, scalable AI delivery.',
    sourceLabel: 'A CAIO’s First 90 Days of AI Data Strategy',
    sourceUrl: '/post/eiuwbmVkSyQcnv4hor8i',
    phases: [
      ['Days 1–30 · Discover', ['Inventory the data flows that touch AI systems and their vendors.', 'Classify regulatory risk, privacy sensitivity, AI risk tier, and data residency.']],
      ['Days 31–60 · Design', ['Establish data lineage for priority AI workloads.', 'Create reusable model-card and privacy-assessment templates.']],
      ['Days 61–90 · Deploy', ['Require a model card before production deployment.', 'Brief leadership on data risks, controls, and remaining gaps.']],
    ],
  },
  'ai-lifecycle': {
    title: 'AI delivery lifecycle',
    reason: 'Your results point to gaps in repeatable delivery, measurement, evaluation, or post-launch learning.',
    sourceLabel: 'The AI Lifecycle: From Experimentation to Continuous Learning',
    sourceUrl: '/post/2BvFsSi24YtzkhlEckEJ',
    phases: [
      ['Days 1–30 · Plan and prepare', ['Define the business objective, success metrics, data strategy, and governance requirements.', 'Assess data quality, legal use, bias, and ground truth for the priority use case.']],
      ['Days 31–60 · Build and evaluate', ['Choose the right architecture, integration pattern, and security controls.', 'Establish baselines and test quality, fairness, latency, robustness, and human experience.']],
      ['Days 61–90 · Deploy and learn', ['Use controlled deployment with validation, human oversight, and operational readiness checks.', 'Monitor performance, drift, feedback, business KPIs, cost, and safety—then feed learning back into delivery.']],
    ],
  },
};
