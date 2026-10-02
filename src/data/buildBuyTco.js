export const tcoPathFields = {
  build: {
    label: 'Build',
    description: 'A tailored internal product and operating model.',
    fields: [
      { id: 'initial', label: 'Up-front delivery', hint: 'Discovery, product and engineering work, data preparation, and initial integrations.', placeholder: 'e.g., 180000' },
      { id: 'platform', label: 'Platform, model & infrastructure / year', hint: 'Cloud, model inference, storage, vector search, observability, and security tooling.', placeholder: 'e.g., 60000' },
      { id: 'people', label: 'Internal team & support / year', hint: 'The portion of product, engineering, data, security, and support capacity dedicated to this use case.', placeholder: 'e.g., 220000' },
      { id: 'operations', label: 'Other operating costs / year', hint: 'Evaluation, governance, training, vendor services, or contingency not included above.', placeholder: 'e.g., 20000' },
    ],
  },
  buy: {
    label: 'Buy',
    description: 'An external product or managed AI capability.',
    fields: [
      { id: 'initial', label: 'Up-front delivery', hint: 'Implementation partner, configuration, integration, migration, and onboarding.', placeholder: 'e.g., 45000' },
      { id: 'platform', label: 'License, usage & infrastructure / year', hint: 'Subscription, per-user or per-request charges, premium support, and required cloud services.', placeholder: 'e.g., 120000' },
      { id: 'people', label: 'Internal team & support / year', hint: 'Product ownership, administration, integration support, security review, and vendor management.', placeholder: 'e.g., 65000' },
      { id: 'operations', label: 'Other operating costs / year', hint: 'Training, change management, audits, contingency, and expected price increases not captured above.', placeholder: 'e.g., 15000' },
    ],
  },
  hybrid: {
    label: 'Hybrid',
    description: 'A vendor foundation combined with differentiated internal layers.',
    fields: [
      { id: 'initial', label: 'Up-front delivery', hint: 'Integration plus the internal data, workflow, or user-experience layer you will own.', placeholder: 'e.g., 110000' },
      { id: 'platform', label: 'Platform, model & infrastructure / year', hint: 'Foundation-model or platform charges plus cloud, data, retrieval, and monitoring services.', placeholder: 'e.g., 90000' },
      { id: 'people', label: 'Internal team & support / year', hint: 'The people needed to operate the custom layer, integrations, governance, and vendor relationship.', placeholder: 'e.g., 135000' },
      { id: 'operations', label: 'Other operating costs / year', hint: 'Evaluation, training, change management, security assurance, and contingency.', placeholder: 'e.g., 18000' },
    ],
  },
};

export const createTcoDraft = (existing = {}) => ({
  years: existing.years ?? 3,
  annualGrowth: existing.annualGrowth ?? 5,
  paths: Object.fromEntries(Object.keys(tcoPathFields).map(path => [path, {
    initial: existing.paths?.[path]?.initial ?? '',
    platform: existing.paths?.[path]?.platform ?? '',
    people: existing.paths?.[path]?.people ?? '',
    operations: existing.paths?.[path]?.operations ?? '',
  }])),
});

const amount = value => Math.max(0, Number(value) || 0);

export function calculateTco(draft) {
  const years = Math.min(10, Math.max(1, Math.round(amount(draft.years) || 3)));
  const annualGrowth = Math.min(100, amount(draft.annualGrowth)) / 100;
  const paths = Object.fromEntries(Object.keys(tcoPathFields).map(path => {
    const values = draft.paths[path];
    const initial = amount(values.initial);
    const recurring = amount(values.platform) + amount(values.people) + amount(values.operations);
    const yearly = Array.from({ length: years }, (_, index) => recurring * ((1 + annualGrowth) ** index));
    return [path, { initial, recurring, yearly, total: initial + yearly.reduce((sum, value) => sum + value, 0) }];
  }));
  const ordered = Object.entries(paths).sort(([, left], [, right]) => left.total - right.total);
  return { years, annualGrowth: annualGrowth * 100, paths, ordered, lowestCostPath: ordered[0][0] };
}

export const formatCurrency = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
