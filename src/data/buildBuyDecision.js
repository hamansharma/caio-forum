export const decisionPaths = {
  build: { label: 'Build', detail: 'Create and operate a tailored capability in-house.', color: '#7c6af7' },
  buy: { label: 'Buy', detail: 'Adopt a credible vendor or embedded capability.', color: '#55cfb0' },
  hybrid: { label: 'Hybrid', detail: 'Combine an external platform or model with differentiated internal data, workflows, or experience.', color: '#59b8ed' },
};

export const businessCaseOptions = [
  { id: 'ready', label: 'Yes — an accountable owner, measurable outcome, and decision timeline are defined.' },
  { id: 'not-ready', label: 'Not yet — the business problem or success measure still needs definition.' },
];

export const decisionQuestions = [
  {
    id: 'differentiation', label: 'Strategic differentiation',
    prompt: 'How unique is this AI use case to your core competitive advantage?',
    choices: [
      { id: 'a', label: 'Standard business function', scores: { buy: 5 } },
      { id: 'b', label: 'Industry-specific, but not proprietary', scores: { hybrid: 5 } },
      { id: 'c', label: 'Core intellectual property or a clear market differentiator', scores: { build: 5 } },
    ],
  },
  {
    id: 'timeToValue', label: 'Time to value',
    prompt: 'How quickly must this capability be in production to meet business goals?',
    choices: [
      { id: 'a', label: 'Within one to four weeks', scores: { buy: 5 } },
      { id: 'b', label: 'Within one to three months', scores: { hybrid: 5 } },
      { id: 'c', label: 'Six months or more is acceptable', scores: { build: 5 } },
    ],
  },
  {
    id: 'risk', label: 'Security and assurance',
    prompt: 'What security, privacy, regulatory, auditability, and human-oversight requirements apply?',
    choices: [
      { id: 'a', label: 'Public or low-risk internal use with standard controls', scores: { buy: 5 } },
      { id: 'b', label: 'Confidential data requiring tenant isolation and review controls', scores: { hybrid: 5 } },
      { id: 'c', label: 'Highly regulated, restricted, or air-gapped data and decisions', scores: { build: 5 } },
    ],
  },
  {
    id: 'capability', label: 'Internal capability',
    prompt: 'What is the current in-house AI and machine-learning engineering capability?',
    choices: [
      { id: 'a', label: 'IT staff, but no sustained AI engineering capability', scores: { buy: 5 } },
      { id: 'b', label: 'Software engineers can integrate APIs and operate applications', scores: { hybrid: 5 } },
      { id: 'c', label: 'Dedicated ML, platform, security, and MLOps capability', scores: { build: 5 } },
    ],
  },
  {
    id: 'control', label: 'Model and architecture control',
    prompt: 'How much control is needed over the underlying model architecture?',
    choices: [
      { id: 'a', label: 'Good outputs and configurable workflows are sufficient', scores: { buy: 5 } },
      { id: 'b', label: 'Fine-tuning, retrieval, or custom orchestration is needed', scores: { hybrid: 5 } },
      { id: 'c', label: 'Full control over weights, hosting, and model behavior is required', scores: { build: 5 } },
    ],
  },
  {
    id: 'dataAdvantage', label: 'Data advantage',
    prompt: 'Do you have differentiated, usable data or proprietary knowledge that would materially improve the solution?',
    choices: [
      { id: 'a', label: 'No — public or commonly available knowledge is sufficient', scores: { buy: 5 } },
      { id: 'b', label: 'Some internal knowledge would improve the result', scores: { hybrid: 5 } },
      { id: 'c', label: 'Proprietary data is central, usable, and legally cleared', scores: { build: 4, hybrid: 3 } },
    ],
  },
  {
    id: 'integration', label: 'Workflow integration',
    prompt: 'How deeply must this capability integrate with systems of record and operational workflows?',
    choices: [
      { id: 'a', label: 'It can operate as a standalone tool or simple add-on', scores: { buy: 5 } },
      { id: 'b', label: 'It needs a few standard integrations or APIs', scores: { hybrid: 5 } },
      { id: 'c', label: 'It must orchestrate deep, changing, or mission-critical workflows', scores: { hybrid: 5, build: 3 } },
    ],
  },
  {
    id: 'operatingModel', label: 'Lifecycle ownership',
    prompt: 'Can the organization fund and operate this capability for its full lifecycle?',
    choices: [
      { id: 'a', label: 'No — we need vendor accountability for support, security, and upgrades', scores: { buy: 5 } },
      { id: 'b', label: 'We can own the application and integration layer, not the full model stack', scores: { hybrid: 5 } },
      { id: 'c', label: 'We can sustain product, data, model, security, and operations ownership', scores: { build: 5 } },
    ],
  },
  {
    id: 'market', label: 'Market and portability',
    prompt: 'Is there a credible external option that meets requirements while preserving acceptable portability and exit options?',
    choices: [
      { id: 'a', label: 'Yes — a credible, interoperable option fits well', scores: { buy: 5 } },
      { id: 'b', label: 'Partly — a platform is viable, but custom layers are needed', scores: { hybrid: 5 } },
      { id: 'c', label: 'No — available options create unacceptable fit, lock-in, or roadmap risk', scores: { build: 5 } },
    ],
  },
];

const addScores = (total, scores) => Object.keys(total).reduce((next, key) => ({ ...next, [key]: total[key] + (scores[key] || 0) }), total);

export function assessDecision(answers, businessCase) {
  const businessCaseNeedsDefinition = businessCase === 'not-ready';
  const scores = decisionQuestions.reduce((total, question) => {
    const choice = question.choices.find(option => option.id === answers[question.id]);
    return choice ? addScores(total, choice.scores) : total;
  }, { build: 0, buy: 0, hybrid: 0 });
  const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [path, score] = ordered[0];
  const runnerUp = ordered[1][1];
  if (score - runnerUp <= 1) return { status: 'evidence', scores, ordered, businessCaseNeedsDefinition };
  const signals = decisionQuestions.map(question => ({ question, choice: question.choices.find(option => option.id === answers[question.id]) })).filter(({ choice }) => choice?.scores[path]);
  return { status: 'recommendation', path, scores, ordered, signals, businessCaseNeedsDefinition };
}

export function analyzeSensitivity(answers, businessCase) {
  const baseline = assessDecision(answers, businessCase);
  if (baseline.status !== 'recommendation') return [];

  return decisionQuestions.flatMap(question => {
    const currentChoice = question.choices.find(choice => choice.id === answers[question.id]);
    return question.choices
      .filter(choice => choice.id !== currentChoice?.id)
      .map(alternateChoice => {
        const alternateAnswers = { ...answers, [question.id]: alternateChoice.id };
        const alternateAssessment = assessDecision(alternateAnswers, businessCase);
        if (alternateAssessment.status === 'recommendation' && alternateAssessment.path === baseline.path) return null;
        return {
          question,
          currentChoice,
          alternateChoice,
          outcome: alternateAssessment.status === 'recommendation'
            ? `would shift the recommendation to ${decisionPaths[alternateAssessment.path].label}`
            : 'would make the recommendation too close to call',
        };
      })
      .filter(Boolean);
  }).slice(0, 3);
}

export const resultGuidance = {
  build: {
    title: 'Build where the advantage is durable',
    next: ['Validate the delivery team, operating model, and multi-year funding.', 'Define the data, security, evaluation, and monitoring architecture.', 'Compare a scoped internal build against a hybrid alternative before committing.'],
  },
  buy: {
    title: 'Buy a credible capability and focus effort on adoption',
    next: ['Run a focused vendor evaluation against security, integration, and data requirements.', 'Validate pricing, portability, and contract exit terms.', 'Plan workflow adoption, governance, and measurement of the business outcome.'],
  },
  hybrid: {
    title: 'Use external foundations, then differentiate where it matters',
    next: ['Define the internal data, workflow, and user-experience layers to own.', 'Set boundaries between vendor/platform responsibilities and internal operations.', 'Validate integration, observability, and portability before scaling.'],
  },
};
