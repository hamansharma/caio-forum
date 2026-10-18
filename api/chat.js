import Anthropic from '@anthropic-ai/sdk';
import { adminDb, requireUser } from './_lib/firebaseAdmin';
import { selectRelevantPosts, formatPostForPrompt, formatPostIndex } from '../scripts/lib/chatContext';

// The forum assistant. The prompt is built here on the server from Firestore;
// the browser sends only the conversation, so this endpoint can't be used as a
// general-purpose proxy for the Anthropic API key.

const MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 1000;

const LIMITS = {
  userPerHour: 20,
  userPerDay: 60,
  allUsersPerDay: 300,   // hard ceiling on daily spend across everyone
  maxMessages: 10,       // conversation turns sent per request
  maxUserChars: 2000,
  maxAssistantChars: 6000,
};

const POSTS_CACHE_MS = 5 * 60 * 1000;
let postsCache = { loadedAt: 0, posts: [] };

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const INSTRUCTIONS = `You are a helpful AI assistant for the CAIO Forum — a discussion community for Chief AI Officer topics, part of the Chicago Booth CAIO Certificate program.

Below are an index of every forum post and the full text of the posts most relevant to the user's question. Use this content to answer accurately. When answering:
- Base your answers primarily on what has been discussed in the forum
- Cite specific posts or authors when relevant, and link posts with markdown using their LINK path, e.g. [Post title](/post/...)
- If the relevant posts don't cover the topic, say the forum hasn't discussed it yet; point to related posts from the index if any fit, and don't offer general knowledge on the topic
- Keep answers concise but thorough
- Use markdown formatting for clarity when helpful
- If asked to summarize discussions, highlight key themes and differing viewpoints`;

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) throw httpError(400, 'Invalid request: messages must be a non-empty array.');
  if (messages.length > LIMITS.maxMessages) throw httpError(400, `This conversation is too long (max ${LIMITS.maxMessages} messages). Clear the chat to start a new one.`);
  for (const message of messages) {
    if (!['user', 'assistant'].includes(message?.role) || typeof message.content !== 'string' || !message.content.trim()) {
      throw httpError(400, 'Invalid message format.');
    }
    const max = message.role === 'user' ? LIMITS.maxUserChars : LIMITS.maxAssistantChars;
    if (message.content.length > max) throw httpError(400, `Messages must be ${max} characters or fewer.`);
  }
  if (messages[0].role !== 'user' || messages.at(-1).role !== 'user') throw httpError(400, 'The conversation must start and end with a user message.');
  return messages.map(({ role, content }) => ({ role, content }));
}

// Counts the request against the user's hourly and daily limits and the shared
// daily cap. Stored in Firestore so limits hold across serverless instances.
async function recordUsage(uid) {
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const hour = now.slice(0, 13);
  const userRef = adminDb.collection('chatUsage').doc(uid);
  const totalRef = adminDb.collection('chatUsage').doc('_total');
  return adminDb.runTransaction(async transaction => {
    const [userSnapshot, totalSnapshot] = await Promise.all([transaction.get(userRef), transaction.get(totalRef)]);
    const usage = userSnapshot.data() || {};
    const total = totalSnapshot.data() || {};
    const hourCount = usage.hour === hour ? usage.hourCount : 0;
    const dayCount = usage.day === day ? usage.dayCount : 0;
    const totalCount = total.day === day ? total.dayCount : 0;
    if (totalCount >= LIMITS.allUsersPerDay) throw httpError(429, 'The forum assistant has reached its daily limit. Please try again tomorrow.');
    if (dayCount >= LIMITS.userPerDay) throw httpError(429, `You've used your ${LIMITS.userPerDay} messages for today. Please try again tomorrow.`);
    if (hourCount >= LIMITS.userPerHour) throw httpError(429, `You've used your ${LIMITS.userPerHour} messages for this hour. Please try again later.`);
    transaction.set(userRef, { hour, hourCount: hourCount + 1, day, dayCount: dayCount + 1, updatedAt: now });
    transaction.set(totalRef, { day, dayCount: totalCount + 1, updatedAt: now });
    return { remainingThisHour: LIMITS.userPerHour - hourCount - 1 };
  });
}

async function loadPosts() {
  if (Date.now() - postsCache.loadedAt < POSTS_CACHE_MS) return postsCache.posts;
  const snapshot = await adminDb.collection('posts').get();
  postsCache = { loadedAt: Date.now(), posts: snapshot.docs.map(document => ({ id: document.id, ...document.data() })) };
  return postsCache.posts;
}

function buildSystemPrompt(posts, messages) {
  const relevant = selectRelevantPosts(posts, messages);
  return `${INSTRUCTIONS}

INDEX OF ALL FORUM POSTS:
${formatPostIndex(posts)}

RELEVANT POSTS (full text):
${relevant.length ? relevant.map(formatPostForPrompt).join('\n\n---\n\n') : '(No posts closely match this question.)'}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not configured');
      throw httpError(500, 'Server configuration error');
    }
    const user = await requireUser(req);
    const messages = validateMessages(req.body?.messages);
    const { remainingThisHour } = await recordUsage(user.uid);
    const system = buildSystemPrompt(await loadPosts(), messages);

    const response = await anthropic.messages.create({ model: MODEL, max_tokens: MAX_OUTPUT_TOKENS, system, messages });

    const reply = response.stop_reason === 'refusal'
      ? "Sorry, I can't help with that request."
      : response.content.filter(block => block.type === 'text').map(block => block.text).join('\n').trim();
    return res.status(200).json({ reply: reply || 'Sorry, I could not generate a response.', remainingThisHour });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
      console.error('Anthropic API unavailable:', error.message);
      return res.status(503).json({ error: 'The forum assistant is busy right now. Please try again in a minute.' });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
      return res.status(502).json({ error: 'The forum assistant could not answer right now.' });
    }
    console.error('Chat request failed:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
