// Keyword-based "related discussions" matching (TF-IDF + cosine similarity).
// Pure functions: no Firestore access, so they can be unit-tested and reused.

const STOPWORDS = new Set(`
a about above after again against all also am an and any are as at be because been before being below between
both but by can could did do does doing down during each even every few for from further get gets getting had has
have having he her here hers him his how however i if in into is it its itself just let like make makes many may me
might more most much must my need needs no nor not now of off on once one only or other our ours out over own per
really same see she should so some still such than that the their theirs them then there these they thing things
this those through to too under until up upon us use used uses using very via want was way we well were what when
where which while who whom why will with within without would yes yet you your yours
`.split(/\s+/).filter(Boolean));

// Light stemming so "models"/"model" and "policies"/"policy" match.
function stem(word) {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokenize(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')          // code blocks
    .replace(/\]\([^)]*\)/g, ' ')              // markdown link targets
    .replace(/https?:\/\/\S+/g, ' ')           // bare URLs
    .replace(/<[^>]+>/g, ' ')                  // html tags
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word))
    .map(stem);
}

// Title words count three times as much as body words; category and Playground
// tool are added as tagged terms so posts in the same space get a small lift.
function weightedTerms(post) {
  const terms = new Map();
  const add = (term, weight) => terms.set(term, (terms.get(term) || 0) + weight);
  tokenize(post.title).forEach(term => add(term, 3));
  tokenize(post.body).forEach(term => add(term, 1));
  if (post.category) add(`category:${post.category}`, 2);
  if (post.playgroundTool) add(`tool:${post.playgroundTool}`, 2);
  return terms;
}

export const isRelatable = post => Boolean(post && !post.deleted && String(post.title || '').trim());

/**
 * Returns Map<postId, Array<{ id, slug?, title, score }>> with up to `limit`
 * related posts each, best first. Posts with nothing above `minScore` get [].
 */
export function findRelatedPosts(posts, { limit = 5, minScore = 0.05 } = {}) {
  const candidates = posts.filter(isRelatable);
  const termsById = new Map(candidates.map(post => [post.id, weightedTerms(post)]));

  const documentFrequency = new Map();
  termsById.forEach(terms => terms.forEach((_, term) => documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1)));
  const total = candidates.length;
  // Terms that appear in nearly every post (e.g. "ai" on an AI forum) carry almost no weight.
  const idf = term => Math.log((1 + total) / (1 + documentFrequency.get(term)));

  const vectors = new Map();
  termsById.forEach((terms, id) => {
    const vector = new Map();
    let norm = 0;
    terms.forEach((count, term) => {
      const weight = (1 + Math.log(count)) * idf(term);
      if (weight > 0) { vector.set(term, weight); norm += weight * weight; }
    });
    vectors.set(id, { vector, norm: Math.sqrt(norm) });
  });

  const similarity = (a, b) => {
    if (!a.norm || !b.norm) return 0;
    const [small, large] = a.vector.size <= b.vector.size ? [a.vector, b.vector] : [b.vector, a.vector];
    let dot = 0;
    small.forEach((weight, term) => { if (large.has(term)) dot += weight * large.get(term); });
    return dot / (a.norm * b.norm);
  };

  const related = new Map();
  candidates.forEach(post => {
    const own = vectors.get(post.id);
    const matches = candidates
      .filter(other => other.id !== post.id)
      .map(other => ({ other, score: similarity(own, vectors.get(other.id)) }))
      .filter(match => match.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ other, score }) => ({
        id: other.id,
        ...(other.slug ? { slug: other.slug } : {}),
        title: other.title,
        score: Math.round(score * 1000) / 1000,
      }));
    related.set(post.id, matches);
  });
  return related;
}
