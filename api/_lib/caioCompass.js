const DIMENSIONS = [
  {
    id: 'vision', label: 'Vision',
    questions: [
      { id: 'vision-shared-direction', prompt: 'How clearly is the organization’s AI direction understood?', levels: ['AI activity exists in isolated pockets, without a shared direction.', 'A limited direction exists, but leadership alignment is weak.', 'Leaders and functions are beginning to align around a shared direction.', 'Executives actively champion an AI direction tied to strategy.', 'AI is central to enterprise transformation and business strategy.'] },
      { id: 'vision-sponsorship', prompt: 'What executive sponsorship exists for AI?', levels: ['No consistent executive sponsor owns enterprise AI outcomes.', 'Sponsorship is occasional or limited to individual business units.', 'A senior leader coordinates cross-functional AI priorities.', 'Executive sponsors actively govern and unblock AI initiatives.', 'Leadership treats AI capability as a sustained enterprise advantage.'] },
      { id: 'vision-communication', prompt: 'How is the AI ambition communicated to teams?', levels: ['Teams receive little shared context for why AI work matters.', 'Communication happens around individual projects only.', 'The emerging ambition is communicated to priority functions.', 'A clear, repeatable narrative connects teams to strategy.', 'The ambition shapes planning, investment, and partner decisions.'] },
    ],
  },
  {
    id: 'strategy', label: 'Strategy',
    questions: [
      { id: 'strategy-portfolio', prompt: 'How are AI opportunities selected and prioritized?', levels: ['Projects are chosen ad hoc by individual teams.', 'Teams react to urgent requests or vendor capabilities.', 'A shared use-case portfolio is beginning to take shape.', 'A funded portfolio is prioritized against business objectives.', 'The portfolio is continuously optimized across the enterprise ecosystem.'] },
      { id: 'strategy-business-case', prompt: 'How are business cases for AI initiatives defined?', levels: ['Business value is assumed or not articulated.', 'Benefits are described informally and inconsistently.', 'Priority initiatives identify expected operational or customer value.', 'Business cases define measurable value, cost, risk, and ownership.', 'Investment decisions dynamically balance value, risk, and strategic options.'] },
      { id: 'strategy-funding', prompt: 'How is AI work funded?', levels: ['Funding is opportunistic and project-by-project.', 'Small tactical budgets support experiments.', 'A coordinated program budget is emerging.', 'AI programs have committed funding and operating plans.', 'Investment is managed as a strategic portfolio with reinvestment discipline.'] },
    ],
  },
  {
    id: 'metrics', label: 'Metrics',
    questions: [
      { id: 'metrics-outcomes', prompt: 'How consistently are AI outcomes measured?', levels: ['Success is subjective or not measured.', 'Basic measures exist but are inconsistently tracked.', 'Priority investments are justified with operational savings or gains.', 'AI ROI and business outcomes are formally tracked.', 'The portfolio is optimized with value-driven measures and learning loops.'] },
      { id: 'metrics-baselines', prompt: 'When do teams establish baselines for expected value?', levels: ['Baselines are not established.', 'Some project teams create informal baselines.', 'Important initiatives define a baseline before delivery.', 'Baseline, target, and realized value are reviewed formally.', 'Baselines continually inform capital allocation and portfolio decisions.'] },
      { id: 'metrics-accountability', prompt: 'Who owns realizing the value from deployed AI?', levels: ['Ownership is unclear after a solution is delivered.', 'Technical teams commonly carry the accountability alone.', 'Business owners are identified for major initiatives.', 'Business and technology leaders jointly own realized value.', 'Value accountability is embedded in operating and incentive models.'] },
    ],
  },
  {
    id: 'governance', label: 'Governance',
    questions: [
      { id: 'governance-policy', prompt: 'How mature are AI policies and standards?', levels: ['Only baseline compliance requirements are considered.', 'Policies exist but are inconsistently applied.', 'Formal policies and stewardship practices are emerging.', 'A governance organization enforces clear standards and controls.', 'Governance enables enterprise-wide value creation while adapting to change.'] },
      { id: 'governance-risk', prompt: 'How are AI risks reviewed before deployment?', levels: ['Risks are reviewed only when a concern is raised.', 'Reviews are reactive or differ widely by team.', 'Higher-risk use cases have a defined review path.', 'Risk, privacy, security, and model controls are embedded in delivery.', 'Continuous assurance adapts controls to portfolio and ecosystem risk.'] },
      { id: 'governance-accountability', prompt: 'How clear are accountability and escalation paths?', levels: ['Decision rights and escalation paths are unclear.', 'Roles exist informally for individual projects.', 'A cross-functional council or stewardship model is emerging.', 'Named owners and escalation paths operate consistently.', 'Accountability is integrated across internal and external AI ecosystems.'] },
    ],
  },
  {
    id: 'people', label: 'People',
    questions: [
      { id: 'people-capability', prompt: 'What AI capability exists across the organization?', levels: ['AI work is fragmented and heavily project-dependent.', 'Central AI resources are beginning to form.', 'Data, AI, and governance teams are becoming coordinated.', 'Specialist and hybrid roles are established across functions.', 'Leadership orchestrates AI investments, talent, and new value creation.'] },
      { id: 'people-adoption', prompt: 'How are employees prepared to use AI responsibly?', levels: ['There is little structured AI education or support.', 'Training is available only for select teams or tools.', 'Priority roles receive role-relevant education and guidance.', 'Adoption, change, and responsible-use support are operationalized.', 'AI fluency and innovation are embedded across the organization.'] },
      { id: 'people-collaboration', prompt: 'How effectively do business, data, technology, and risk teams collaborate?', levels: ['Teams work largely independently.', 'Collaboration occurs when individual projects demand it.', 'Cross-functional delivery teams are increasingly common.', 'A repeatable operating model enables shared decisions and delivery.', 'Collaboration extends fluidly across functions, partners, and the ecosystem.'] },
    ],
  },
  {
    id: 'processes', label: 'Processes',
    questions: [
      { id: 'processes-lifecycle', prompt: 'How repeatable is the AI delivery lifecycle?', levels: ['No formal AI lifecycle exists.', 'Data integration and delivery practices improve but remain siloed.', 'AI standards, documentation, and lifecycle practices are emerging.', 'Reusable AI assets support enterprise-wide initiatives.', 'AI lifecycles are standardized and embedded into operations.'] },
      { id: 'processes-production', prompt: 'How are AI solutions monitored after launch?', levels: ['Post-launch performance is rarely monitored.', 'Monitoring happens when a team notices an issue.', 'Important solutions have basic performance and usage checks.', 'Monitoring, incident response, and improvement cycles are repeatable.', 'Continuous learning and assurance improve the portfolio systematically.'] },
      { id: 'processes-reuse', prompt: 'How often are data, prompts, models, and patterns reused?', levels: ['Teams recreate most work independently.', 'Informal reuse depends on personal networks.', 'Common patterns and documentation are beginning to be shared.', 'Reusable assets and standards accelerate enterprise delivery.', 'A managed internal ecosystem compounds learning and reuse.'] },
    ],
  },
  {
    id: 'technology', label: 'Technology',
    questions: [
      { id: 'technology-platform', prompt: 'How ready is the technology environment for scalable AI?', levels: ['Infrastructure and tools are fragmented and redundant.', 'Infrastructure limitations frequently hinder delivery.', 'Technology planning is increasingly aligned to business needs.', 'Standardized, cloud-enabled AI environments support delivery.', 'A scalable cloud-native AI ecosystem supports enterprise capability.'] },
      { id: 'technology-data', prompt: 'How usable is data for priority AI use cases?', levels: ['Data is difficult to find, access, or trust.', 'Some integrations exist but data remains highly siloed.', 'Priority data products and access patterns are being established.', 'Governed, reliable data supports repeatable AI delivery.', 'Data capabilities are treated as a strategic, interoperable enterprise asset.'] },
      { id: 'technology-integration', prompt: 'How readily can AI solutions be integrated into workflows?', levels: ['Integration is mostly manual or one-off.', 'Individual teams build limited integrations around tools.', 'Common integration patterns are emerging for priority workflows.', 'Secure APIs and platforms enable repeatable workflow integration.', 'Composable platforms enable rapid, governed ecosystem-scale integration.'] },
    ],
  },
];

export const COMPASS_DIMENSIONS = DIMENSIONS;

export function calculateCompassAssessment(rawAnswers) {
  const answers = rawAnswers && typeof rawAnswers === 'object' ? rawAnswers : {};
  const expectedIds = DIMENSIONS.flatMap(dimension => dimension.questions.map(question => question.id));
  const normalizedAnswers = {};
  for (const id of expectedIds) {
    const level = Number(answers[id]);
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      const error = new Error('Please answer every assessment question before continuing.');
      error.statusCode = 400;
      throw error;
    }
    normalizedAnswers[id] = level;
  }

  const domains = DIMENSIONS.map(dimension => {
    const values = dimension.questions.map(question => normalizedAnswers[question.id]);
    const score = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
    return { id: dimension.id, label: dimension.label, score, questionCount: values.length };
  });
  const overallScore = Math.round((domains.reduce((sum, domain) => sum + domain.score, 0) / domains.length) * 10) / 10;
  const lowest = [...domains].sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));
  const spread = Math.round((Math.max(...domains.map(domain => domain.score)) - Math.min(...domains.map(domain => domain.score))) * 10) / 10;

  const stage = overallScore < 1.5 ? { level: 1, label: 'Aware' }
    : overallScore < 2.5 ? { level: 2, label: 'Reactive' }
      : overallScore < 3.5 ? { level: 3, label: 'Proactive' }
        : overallScore < 4.5 ? { level: 4, label: 'Managed' }
          : { level: 5, label: 'Optimized' };
  const health = lowest[0].score < 2 ? { label: 'At risk', summary: 'Foundational gaps could limit value or increase delivery risk.' }
    : spread >= 2 ? { label: 'Uneven', summary: 'Capabilities are progressing unevenly; address the weakest dependencies before scaling.' }
      : overallScore >= 3.5 ? { label: 'Healthy', summary: 'Core capabilities are working together; focus on disciplined scale and optimization.' }
        : { label: 'Developing', summary: 'The foundation is taking shape; focused sequencing can turn momentum into repeatable capability.' };

  const recommendedRouteIds = [];
  if (normalizedAnswers['vision-shared-direction'] <= 3 || normalizedAnswers['strategy-portfolio'] <= 3 || normalizedAnswers['people-capability'] <= 3) {
    recommendedRouteIds.push('transformation-operating-model');
  }
  if (normalizedAnswers['technology-data'] <= 3 || normalizedAnswers['governance-risk'] <= 2) {
    recommendedRouteIds.push('data-foundation');
  }
  if (normalizedAnswers['processes-lifecycle'] <= 3 || normalizedAnswers['processes-production'] <= 3 || normalizedAnswers['metrics-outcomes'] <= 3) {
    recommendedRouteIds.push('ai-lifecycle');
  }
  if (!recommendedRouteIds.length) recommendedRouteIds.push('transformation-operating-model');

  return { answers: normalizedAnswers, domains, overallScore, stage, health, priorityDomainIds: lowest.slice(0, 3).map(domain => domain.id), recommendedRouteIds };
}
