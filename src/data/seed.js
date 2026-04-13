export const CATEGORIES = [
  { id: 'concepts', label: 'Concepts', color: 'concepts' },
  { id: 'discussion', label: 'Discussion', color: 'discussion' },
  { id: 'strategy', label: 'Strategy', color: 'strategy' },
  { id: 'ethics', label: 'Ethics', color: 'ethics' },
];

export const INITIAL_POSTS = [
  {
    id: '1',
    title: 'Understanding Transformer Architecture: A Deep Dive',
    body: 'A comprehensive breakdown of how transformer models work, from attention mechanisms to positional encoding. Perfect for beginners and intermediate learners. The self-attention mechanism allows the model to weigh the relevance of different words in a sequence, while positional encoding gives the model a sense of word order.',
    category: 'concepts',
    author: 'ai_researcher',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    votes: 342,
    comments: [
      { id: 'c1', postId: '1', author: 'ml_engineer', body: 'Great explanation! The attention mechanism section really clicked for me.', votes: 45, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: 'c2', postId: '1', author: 'booth_student', body: 'As someone from a business background, this was very accessible. Thank you!', votes: 23, createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    ]
  },
  {
    id: '2',
    title: 'GPT-5 vs Claude Opus: Performance Comparison',
    body: "I've been testing both models extensively for the past month. Here are my findings on reasoning, creativity, and factual accuracy. For complex multi-step reasoning tasks, both perform impressively, but with different failure modes worth understanding for enterprise deployment.",
    category: 'discussion',
    author: 'ml_engineer',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    votes: 289,
    comments: [
      { id: 'c3', postId: '2', author: 'cto_perspective', body: 'Which one performed better on structured data extraction tasks?', votes: 18, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    ]
  },
  {
    id: '3',
    title: 'Building an AI Strategy for Fortune 500: Lessons from the Field',
    body: "After advising 12 large enterprises on their AI transformation journeys, here are the patterns I keep seeing. The companies that succeed don't start with technology — they start with use-case prioritization and change management. The CAIO role is fundamentally a bridge between technical capability and business value.",
    category: 'strategy',
    author: 'caio_practitioner',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    votes: 514,
    comments: []
  },
  {
    id: '4',
    title: 'Ethical Frameworks for AI Deployment: A CAIO Perspective',
    body: "When deploying AI at scale, the ethical questions aren't just philosophical — they have direct business and legal implications. This post explores the key frameworks every CAIO should understand: fairness, accountability, transparency, and explainability (FATE).",
    category: 'ethics',
    author: 'ethics_in_ai',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    votes: 198,
    comments: []
  },
];