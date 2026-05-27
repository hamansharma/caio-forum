export function searchPosts(posts, query) {
  if (!query.trim()) return { results: posts, query: '' };

  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/);

  const scored = posts.map(post => {
    const fields = {
      title: (post.title || '').toLowerCase(),
      body: (post.body || '').toLowerCase(),
      author: (post.author || '').toLowerCase(),
      category: (post.category || '').toLowerCase(),
    };

    let score = 0;
    let matchedFields = [];

    for (const term of terms) {
      if (fields.title.includes(term)) { score += 10; if (!matchedFields.includes('title')) matchedFields.push('title'); }
      if (fields.body.includes(term)) { score += 5; if (!matchedFields.includes('body')) matchedFields.push('body'); }
      if (fields.author.includes(term)) { score += 7; if (!matchedFields.includes('author')) matchedFields.push('author'); }
      if (fields.category.includes(term)) { score += 6; if (!matchedFields.includes('category')) matchedFields.push('category'); }
    }

    return { ...post, _score: score, _matchedFields: matchedFields };
  });

  const results = scored
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score);

  return { results, query: q };
}

export function highlightText(text, query) {
  if (!query || !text) return text;
  const terms = query.toLowerCase().trim().split(/\s+/);
  let result = text;
  for (const term of terms) {
    if (!term) continue;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '##HIGHLIGHT_START##$1##HIGHLIGHT_END##');
  }
  return result;
}

export function renderHighlighted(text, query, maxLength = 120) {
  if (!text) return '';
  const highlighted = highlightText(text, query);
  const truncated = highlighted.length > maxLength
    ? highlighted.slice(0, maxLength) + '…'
    : highlighted;
  return truncated
    .split('##HIGHLIGHT_START##')
    .map((part, i) => {
      if (part.includes('##HIGHLIGHT_END##')) {
        const [match, rest] = part.split('##HIGHLIGHT_END##');
        return [
          { type: 'mark', text: match, key: `m${i}` },
          { type: 'text', text: rest, key: `t${i}` }
        ];
      }
      return [{ type: 'text', text: part, key: `p${i}` }];
    })
    .flat();
}