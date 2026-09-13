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

export const roadmapActions = {
  vision: ['Name an executive AI sponsor and establish a monthly AI steering cadence.', 'Publish a one-page AI ambition that connects priority outcomes, guardrails, and decision rights.'],
  strategy: ['Create a ranked use-case portfolio with value, feasibility, risk, and accountable business owner for every item.', 'Fund the next 90 days around a small number of measurable outcomes rather than disconnected pilots.'],
  metrics: ['Define baselines, target outcomes, and a realization owner before approving the next AI initiative.', 'Review realized value monthly and stop or redesign initiatives that do not meet their learning or value threshold.'],
  governance: ['Establish a lightweight intake and risk-tiering process for every AI use case.', 'Assign named owners for privacy, security, model risk, and business accountability before deployment.'],
  people: ['Identify the priority roles that need AI fluency, practical guidance, and adoption support.', 'Form a cross-functional delivery squad for the highest-value use case.'],
  processes: ['Document one repeatable lifecycle from use-case intake through monitoring and improvement.', 'Create a shared library for approved patterns, prompts, data sources, and lessons learned.'],
  technology: ['Map the minimum data, integration, and platform capabilities needed for the top use cases.', 'Standardize secure integration patterns before scaling new tools across teams.'],
};
