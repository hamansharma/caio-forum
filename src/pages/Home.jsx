import React, { useState } from 'react';
import { Flame, Clock, TrendingUp } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import PostCard from '../components/PostCard';
import './Home.css';

const SORT_OPTS = [
  { key: 'hot', label: 'Hot', icon: Flame },
  { key: 'new', label: 'New', icon: Clock },
  { key: 'top', label: 'Top', icon: TrendingUp },
];

export default function Home() {
  const { posts, loading } = useForum();
  const [sort, setSort] = useState('hot');
  const [filter, setFilter] = useState('all');

  const sorted = [...posts]
    .filter(p => filter === 'all' || p.category === filter)
    .sort((a, b) => {
      if (sort === 'new') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'top') return b.votes - a.votes;
      return (b.votes * 0.7 + b.comments.length * 10) - (a.votes * 0.7 + a.comments.length * 10);
    });

  return (
    <div className="home">
      <div className="home-main">
        <div className="sort-bar">
          {SORT_OPTS.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`sort-btn ${sort === key ? 'active' : ''}`} onClick={() => setSort(key)}>
              <Icon size={14} /> {label}
            </button>
          ))}
          <div className="filter-pills">
            {['all', 'concepts', 'discussion', 'strategy', 'ethics'].map(cat => (
              <button key={cat} className={`filter-pill ${filter === cat ? 'active' : ''} ${cat !== 'all' ? `tag-${cat}` : ''}`}
                onClick={() => setFilter(cat)}>
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
        <div className="posts-list">
          {loading
            ? <div style={{color:'var(--text-muted)', padding:'40px', textAlign:'center'}}>Loading discussions…</div>
            : sorted.length === 0
              ? <div style={{color:'var(--text-muted)', padding:'40px', textAlign:'center'}}>No posts yet. Be the first!</div>
              : sorted.map(post => <PostCard key={post.id} post={post} />)
          }
        </div>
      </div>

      <aside className="home-sidebar">
        <div className="sidebar-card">
          <h3>About CAIO Forum</h3>
          <p>A discussion space for Chief AI Officer topics, companion to the Chicago Booth CAIO Certificate program.</p>
          <div className="sidebar-stats">
            <div><strong>{posts.length}</strong><span>Posts</span></div>
            <div><strong>{posts.reduce((a, p) => a + p.comments.length, 0)}</strong><span>Comments</span></div>
          </div>
        </div>
        <div className="sidebar-card">
          <h3>Topics</h3>
          {['concepts', 'discussion', 'strategy', 'ethics'].map(cat => (
            <button key={cat} className={`sidebar-topic tag-${cat}`} onClick={() => setFilter(cat)}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}