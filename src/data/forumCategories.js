// Forum categories with the copy used on their landing pages (/category/<id>).
export const FORUM_CATEGORIES = [
  {
    id: 'concepts',
    label: 'Concepts',
    heading: 'AI concepts for leaders',
    description: 'Plain-language explanations of AI models, data, and systems, written for executives and Chief AI Officers who need to understand the technology well enough to make decisions.',
  },
  {
    id: 'strategy',
    label: 'Strategy',
    heading: 'AI strategy discussions',
    description: 'How organizations plan, fund, prioritize, and scale AI: operating models, investment cases, roadmaps, and build-versus-buy decisions.',
  },
  {
    id: 'discussion',
    label: 'Discussion',
    heading: 'Open discussions on AI leadership',
    description: 'Questions, debates, and experiences from people leading AI adoption, from change management to the role of the Chief AI Officer.',
  },
  {
    id: 'ethics',
    label: 'Ethics',
    heading: 'Responsible AI and ethics',
    description: 'Governance, fairness, data quality, and the ethical questions organizations face when they put AI into production.',
  },
  {
    id: 'links',
    label: 'Links',
    heading: 'AI leadership resources',
    description: 'Curated links to reading, tools, and references shared by the CAIO Forum community.',
  },
];

export const forumCategory = id => FORUM_CATEGORIES.find(category => category.id === id);
export const categoryPath = id => `/category/${id}`;
