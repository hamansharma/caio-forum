import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideHtml, hasPageSlots, plainParagraphs, postPage, postPreview, renderPage } from './pageHtml.js';

const template = '<html><head><meta name="page-meta" content="start" /><title>Home</title><meta name="page-meta" content="end" /></head>'
  + '<body><noscript><div id="page-content"></div></noscript><div id="root"></div></body></html>';
const post = {
  id: 'abc', slug: 'agents-at-work', title: 'Agents <at> work', body: 'First **point**.\n\nSecond [link](https://x.test).',
  author: 'neo', category: 'strategy', createdAt: '2026-10-01T00:00:00.000Z',
  comments: [{ id: 'c1', author: 'trinity', body: 'Agreed', createdAt: '2026-10-02T00:00:00.000Z' }, { id: 'c2', author: 'x', body: 'gone', deleted: true }],
  related: [{ slug: 'other', title: 'Other post' }],
};

test('a post page gets its own head tags and readable content', () => {
  const { meta, contentHtml } = postPage(post);
  const html = renderPage(template, meta, contentHtml);
  assert.match(html, /<title>Agents &lt;at&gt; work \| CAIO Forum<\/title>/, 'title is escaped');
  assert.match(html, /<link rel="canonical" href="https:\/\/caioleadership.com\/post\/agents-at-work" \/>/);
  assert.match(html, /<meta property="og:type" content="article" \/>/);
  assert.match(html, /id="page-jsonld"/);
  assert.match(html, /<p>First point\.<\/p><p>Second link\.<\/p>/, 'markdown becomes plain paragraphs');
  assert.match(html, /1 comment</, 'deleted comments are left out');
  assert.match(html, /<a href="\/post\/other">Other post<\/a>/);
  assert.equal((html.match(/<title>/g) || []).length, 1, 'the default title is replaced, not duplicated');
});

test('rendering into an already-filled page replaces the previous content', () => {
  const first = renderPage(template, { title: 'One', description: 'd', path: '/one' }, '<p>one</p>');
  assert.ok(hasPageSlots(first));
  const second = renderPage(first, { title: 'Two', description: 'd', path: '/two' }, '<p>two</p>');
  assert.ok(!second.includes('<p>one</p>') && second.includes('<p>two</p>'));
  assert.equal((second.match(/<title>/g) || []).length, 1);
});

test('plain paragraphs never pass HTML through', () => {
  const html = plainParagraphs('<script>alert(1)</script>');
  assert.ok(!html.includes('<script'));
  assert.match(html, /^<p>&lt;script/);
});

test('pages carry the path they belong to and, for posts, the post data', () => {
  const { meta, contentHtml, data } = postPage({ ...post, createdAt: { toDate: () => new Date('2026-10-01T00:00:00.000Z') } });
  const html = renderPage(template, meta, contentHtml, meta.path, data);
  assert.match(html, /<div id="page-content" data-path="\/post\/agents-at-work">/);
  const json = JSON.parse(html.match(/<script type="application\/json" id="page-data">(.*?)<\/script>/)[1]);
  assert.equal(json.post.createdAt, '2026-10-01T00:00:00.000Z', 'Timestamps become ISO strings');
  assert.ok(!html.match(/id="page-data">[^<]*<\/(?!script)/), 'no raw < inside the JSON');
});

test('home previews are short and marked partial', () => {
  const preview = postPreview({ ...post, body: 'x'.repeat(5000) });
  assert.equal(preview.body.length, 600);
  assert.equal(preview.partial, true);
  assert.deepEqual(preview.comments, [{ id: 'c1', parentId: null }], 'deleted comments dropped, bodies left out');
});

test('tool pages get their guide', () => {
  assert.match(guideHtml('caioCompass'), /<h2>About CAIO Compass<\/h2>/);
  assert.equal(guideHtml('no-such-page'), '');
});
