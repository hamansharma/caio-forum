import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Flame, Clock, TrendingUp } from 'lucide-react';
import { usePosts } from '../context/ForumContext';
import PostCard from '../components/PostCard';
import usePageMeta from '../hooks/usePageMeta';
import { PAGE_META } from '../data/pageMeta';
import { FORUM_CATEGORIES, categoryPath } from '../data/forumCategories';
import { SORTS, visibleComments } from '../utils/postDisplay';
import './Home.css';

// Latest posts first by default; the choice is kept in the URL (?sort=hot).
const SORT_OPTS = [
  { key: 'new', label: 'New', icon: Clock },
  { key: 'hot', label: 'Hot', icon: Flame },
  { key: 'top', label: 'Top', icon: TrendingUp },
];
const DEFAULT_SORT = 'new';

export default function Home() {
  usePageMeta(PAGE_META.home.title, PAGE_META.home.description, { canonicalPath: PAGE_META.home.path });
  const { posts, loading } = usePosts();
  const [params, setParams] = useSearchParams();
  const sort = SORTS[params.get('sort')] ? params.get('sort') : DEFAULT_SORT;
  const filter = params.get('category') || 'all';
  const update = (key, value, fallback) => setParams(current => {
    const next = new URLSearchParams(current);
    if (value === fallback) next.delete(key); else next.set(key, value);
    return next;
  }, { replace: true });
  const forumPosts = posts.filter(post => !post.playground && !post.deleted);

  const sorted = forumPosts
    .filter(p => filter === 'all' || p.category === filter)
    .sort(SORTS[sort]);

  return (
    <div className="home">
      <div className="home-main">
        <header className="home-page-header"><h1>AI leadership discussions</h1><p>Practical ideas on AI strategy, technology, governance, and responsible adoption.</p></header>
        <div className="sort-bar">
          {SORT_OPTS.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`sort-btn ${sort === key ? 'active' : ''}`} aria-pressed={sort === key} onClick={() => update('sort', key, DEFAULT_SORT)}>
              <Icon size={14} /> {label}
            </button>
          ))}
          <div className="filter-pills">
            {['all', 'concepts', 'discussion', 'strategy', 'ethics', 'links'].map(cat => (
              <button key={cat} className={`filter-pill ${filter === cat ? 'active' : ''} ${cat !== 'all' ? `tag-${cat}` : ''}`}
                aria-pressed={filter === cat} onClick={() => update('category', cat, 'all')}>
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
        <div className="posts-list">
          {loading
            ? <div className="posts-empty">Loading discussions…</div>
            : sorted.length === 0
              ? <div className="posts-empty">{filter === 'all' ? 'No posts yet. Be the first!' : 'No posts in this category yet.'}</div>
              : sorted.map(post => <PostCard key={post.id} post={post} />)
          }
        </div>
      </div>

      <aside className="home-sidebar">
        <div className="sidebar-card">
          <h2>About CAIO Forum</h2>
          <p>A discussion space for Chief AI Officer topics. Do not post copyright material without proper consent.</p>
          <div className="sidebar-stats">
            <div><strong>{loading ? '—' : forumPosts.length}</strong><span>Posts</span></div>
            <div><strong>{loading ? '—' : forumPosts.reduce((total, post) => total + visibleComments(post).length, 0)}</strong><span>Comments</span></div>
          </div>
        </div>
        <div className="sidebar-card">
          <h2>Topics</h2>
          {FORUM_CATEGORIES.map(category => (
            <Link key={category.id} to={categoryPath(category.id)} className={`sidebar-topic tag-${category.id}`}>
              {category.label}
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
