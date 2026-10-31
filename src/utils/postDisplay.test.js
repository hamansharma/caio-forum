import { toMillis, excerpt, markdownToPlainText, SORTS, plural, visibleComments } from './postDisplay';

const timestamp = iso => ({ toDate: () => new Date(iso) });

describe('toMillis', () => {
  it('reads Firestore Timestamps and ISO strings, and treats missing dates as 0', () => {
    expect(toMillis(timestamp('2026-10-01T00:00:00Z'))).toBe(Date.parse('2026-10-01T00:00:00Z'));
    expect(toMillis('2026-10-02T00:00:00Z')).toBe(Date.parse('2026-10-02T00:00:00Z'));
    expect(toMillis(null)).toBe(0);
    expect(toMillis('not a date')).toBe(0);
  });
});

describe('sorting', () => {
  const posts = [
    { id: 'old-popular', createdAt: timestamp('2026-01-01T00:00:00Z'), votes: 40, comments: [] },
    { id: 'newest', createdAt: timestamp('2026-10-30T00:00:00Z'), votes: 1, comments: [] },
    { id: 'recent-active', createdAt: timestamp('2026-10-28T00:00:00Z'), votes: 6, comments: [{}, {}, {}] },
    { id: 'string-date', createdAt: '2026-10-29T00:00:00Z', votes: 2, comments: [] },
  ];
  const order = sort => [...posts].sort(SORTS[sort]).map(post => post.id);

  it('"new" puts the latest posts first, whatever the date format', () => {
    expect(order('new')).toEqual(['newest', 'string-date', 'recent-active', 'old-popular']);
  });

  it('"top" orders by votes', () => {
    expect(order('top')[0]).toBe('old-popular');
  });

  it('"hot" favors recent activity over old popularity', () => {
    expect(order('hot').indexOf('recent-active')).toBeLessThan(order('hot').indexOf('old-popular'));
  });
});

describe('previews', () => {
  it('strips markdown, tables and links', () => {
    expect(markdownToPlainText('## Title\n\n| Dimension | Level 1 |\n|---|---|\n| Data | **Ad hoc** |\nSee [the guide](https://x.com).'))
      .toBe('Title Dimension Level 1 Data Ad hoc See the guide.');
  });

  it('cuts long text at a word boundary with an ellipsis', () => {
    const text = excerpt('word '.repeat(60), 40);
    expect(text.endsWith('word…')).toBe(true);
    expect(text.length).toBeLessThanOrEqual(41);
    expect(excerpt('Short post.', 40)).toBe('Short post.');
  });
});

describe('counts', () => {
  it('pluralizes and ignores deleted comments', () => {
    expect(plural(1, 'comment')).toBe('1 comment');
    expect(plural(2, 'comment')).toBe('2 comments');
    expect(visibleComments({ comments: [{}, { deleted: true }] })).toHaveLength(1);
  });
});
