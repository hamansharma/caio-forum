import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const SEED_POSTS = [
  {
    title: 'Understanding Transformer Architecture: A Deep Dive',
    body: 'A comprehensive breakdown of how transformer models work, from attention mechanisms to positional encoding. The self-attention mechanism allows the model to weigh the relevance of different words in a sequence, while positional encoding gives the model a sense of word order.',
    category: 'concepts', author: 'ai_researcher', votes: 342,
    comments: [
      { id: 'c1', author: 'ml_engineer', body: 'Great explanation! The attention mechanism section really clicked for me.', votes: 45, createdAt: new Date().toISOString() },
      { id: 'c2', author: 'booth_student', body: 'As someone from a business background, this was very accessible. Thank you!', votes: 23, createdAt: new Date().toISOString() },
    ]
  },
  {
    title: 'GPT-5 vs Claude Opus: Performance Comparison',
    body: "I've been testing both models extensively for the past month. Here are my findings on reasoning, creativity, and factual accuracy. For complex multi-step reasoning tasks, both perform impressively but with different failure modes worth understanding for enterprise deployment.",
    category: 'discussion', author: 'ml_engineer', votes: 289,
    comments: [{ id: 'c3', author: 'cto_perspective', body: 'Which one performed better on structured data extraction tasks?', votes: 18, createdAt: new Date().toISOString() }]
  },
  {
    title: 'Building an AI Strategy for Fortune 500: Lessons from the Field',
    body: "After advising 12 large enterprises on their AI transformation journeys, here are the patterns I keep seeing. The companies that succeed don't start with technology — they start with use-case prioritization and change management.",
    category: 'strategy', author: 'caio_practitioner', votes: 514, comments: []
  },
  {
    title: 'Ethical Frameworks for AI Deployment: A CAIO Perspective',
    body: "When deploying AI at scale, the ethical questions aren't just philosophical — they have direct business and legal implications. This post explores FATE: Fairness, Accountability, Transparency, and Explainability.",
    category: 'ethics', author: 'ethics_in_ai', votes: 198, comments: []
  },
];

export async function seedFirestore() {
  for (const post of SEED_POSTS) {
    await addDoc(collection(db, 'posts'), { ...post, createdAt: serverTimestamp() });
  }
  console.log('Seeded!');
}