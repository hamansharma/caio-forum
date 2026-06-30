import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, ArrowLeft, MessageSquare, Clock, TrendingUp, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useForum } from '../context/ForumContext';
import CommentThread from '../components/CommentThread';
import MarkdownRenderer from '../components/MarkdownRenderer';
import MarkdownEditor from '../components/MarkdownEditor';
import './PostDetail.css';

const SORT_OPTS = [
  { key: 'newest', label: 'Newest', icon: Clock },
  { key: 'oldest', label: 'Oldest', icon: History },
  { key: 'top', label: 'Top Voted', icon: TrendingUp },
];

function sortComments(comments, sort) {
  const topLevel = comments.filter(c => !c.parentId);
  const rest = comments.filter(c => c.parentId);

  const sorted = [...topLevel].sort((a, b) => {
    if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'top') return (b.votes || 0) - (a.votes || 0);
    return 0;
  });

  return [...sorted, ...rest];
}

export default function PostDetail() {
  const { id } = useParams();
  const { posts, user, votePost, votedPosts, addComment } = useForum();
  const [comment, setComment] = useState('');
  const [commentSort, setCommentSort] = useState('newest');
  const post = posts.find(p => p.id === id);

  if (!post) return <div className="not-found">Post not found. <Link to="/">Go home</Link></div>;

  const voted = votedPosts[post.id] || 0;

  const handleComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addComment(post.id, comment.trim(), null);
    setComment('');
  };

  const sortedComments = sortComments(post.comments || [], commentSort);

  return (
    <div className="detail-page">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to feed</Link>

      <article className="detail-post">
        <div className="detail-vote">
          <button className={`vote-btn up ${voted === 1 ? 'active' : ''}`}
            onClick={() => votePost(post.id, voted === 1 ? 0 : 1)}>
            <ArrowUp size={18} />
          </button>
          <span className={`vote-count ${voted !== 0 ? 'voted' : ''}`}>{post.votes}</span>
          <button className={`vote-btn down ${voted === -1 ? 'active' : ''}`}
            onClick={() => votePost(post.id, voted === -1 ? 0 : -1)}>
            <ArrowDown size={18} />
          </button>
        </div>
        <div className="detail-content">
          <div className="post-meta">
            <span className={`tag tag-${post.category}`}>{post.category}</span>
            <span className="meta-text">
              u/<strong>{post.author}</strong> · {post.createdAt
                ? formatDistanceToNow(post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt))
                : 'just now'} ago
            </span>
          </div>
          <h1 className="detail-title">{post.title}</h1>
          <MarkdownRenderer content={post.body} />
        </div>
      </article>

      <section className="comments-section">
        <div className="comments-header">
          <h2><MessageSquare size={16} /> {post.comments.length} Comments</h2>
          <div className="comment-sort-bar">
            {SORT_OPTS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`comment-sort-btn ${commentSort === key ? 'active' : ''}`}
                onClick={() => setCommentSort(key)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        {user ? (
          <form className="comment-form" onSubmit={handleComment}>
            <MarkdownEditor
              value={comment}
              onChange={setComment}
              placeholder={`Comment as u/${user.username}`}
              rows={4}
            />
            <button type="submit" disabled={!comment.trim()}>Add Comment</button>
          </form>
        ) : (
          <div className="login-prompt">Sign in to leave a comment</div>
        )}

        <CommentThread postId={post.id} comments={sortedComments} />
      </section>
    </div>
  );
}