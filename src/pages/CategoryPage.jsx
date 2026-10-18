import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePosts } from '../context/ForumContext';
import PostCard from '../components/PostCard';
import NotFound from './NotFound';
import usePageMeta from '../hooks/usePageMeta';
import { FORUM_CATEGORIES, forumCategory, categoryPath } from '../data/forumCategories';
import './Home.css';

const toTime = value => (value?.toDate ? value.toDate() : new Date(value || 0)).getTime();

// Landing page for one forum category, e.g. /category/strategy.
export default function CategoryPage() {
  const { category: id } = useParams();
  const category = forumCategory(id);
  const { posts, loading } = usePosts();
  const categoryPosts = posts
    .filter(post => !post.playground && !post.deleted && post.category === id)
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));

  usePageMeta(
    category ? `${category.label} Discussions | CAIO Forum` : 'Page Not Found | CAIO Forum',
    category ? category.description : 'The requested CAIO Forum page could not be found.',
    { canonicalPath: categoryPath(id) },
  );
  if (!category) return <NotFound />;

  return (
    <div className="home">
      <div className="home-main">
        <Link to="/" className="category-back"><ArrowLeft size={14} /> All discussions</Link>
        <header className="home-page-header">
          <h1>{category.heading}</h1>
          <p>{category.description}</p>
        </header>
        <div className="posts-list">
          {loading
            ? <div className="category-empty">Loading discussions…</div>
            : categoryPosts.length === 0
              ? <div className="category-empty">No posts in this category yet.</div>
              : categoryPosts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      </div>

      <aside className="home-sidebar">
        <div className="sidebar-card">
          <h3>Other topics</h3>
          {FORUM_CATEGORIES.filter(other => other.id !== id).map(other => (
            <Link key={other.id} to={categoryPath(other.id)} className={`sidebar-topic tag-${other.id}`}>{other.label}</Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
