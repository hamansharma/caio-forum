import { slugify, looksLikePostId, postPath } from './postUrl';

describe('slugify', () => {
  it('turns a title into a lowercase hyphenated slug', () => {
    expect(slugify('What does a Chief AI Officer do?')).toBe('what-does-a-chief-ai-officer-do');
  });

  it('handles accents, ampersands and repeated punctuation', () => {
    expect(slugify('  Café & Governance — AI!!  ')).toBe('cafe-and-governance-ai');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('???')).toBe('');
  });

  it('cuts long titles at a word boundary', () => {
    const slug = slugify('word '.repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug.endsWith('word')).toBe(true);
  });
});

describe('looksLikePostId', () => {
  it('matches Firestore auto IDs but not slugs', () => {
    expect(looksLikePostId('tmIjJVnIyixaoP3Iau1R')).toBe(true);
    expect(looksLikePostId('what-does-a-chief-ai-officer-do')).toBe(false);
  });
});

describe('postPath', () => {
  it('uses the stored slug for new posts', () => {
    expect(postPath({ id: 'tmIjJVnIyixaoP3Iau1R', slug: 'ai-governance', title: 'Edited later' })).toBe('/post/ai-governance');
  });

  it('uses id plus title for older posts', () => {
    expect(postPath({ id: 'tmIjJVnIyixaoP3Iau1R', title: 'AI Governance 101' })).toBe('/post/tmIjJVnIyixaoP3Iau1R/ai-governance-101');
  });

  it('falls back to the bare id when the title has no usable characters', () => {
    expect(postPath({ id: 'tmIjJVnIyixaoP3Iau1R', title: '???' })).toBe('/post/tmIjJVnIyixaoP3Iau1R');
  });
});
