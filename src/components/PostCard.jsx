import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, MessageSquare, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useForum } from '../context/ForumContext';
import './PostCard.css';

export default function PostCard({ post }) {
  const { votePost, votedPosts } = useForum();
  const voted = votedPosts[post.id] || 0;

  return (
    <div className="post-card">
      <div className="vote-col">
        <button className={`vote-btn up ${voted === 1 ? 'active' : ''}`} onClick={() => votePost(post.id, voted === 1 ? 0 : 1)}>
          <ArrowUp size={16} />
        </button>
        <span className={`vote-count ${voted !== 0 ? 'voted' : ''}`}>{post.votes}</span>
        <button className={`vote-btn down ${voted === -1 ? 'active' : ''}`} onClick={() => votePost(post.id, voted === -1 ? 0 : -1)}>
          <ArrowDown size={16} />
        </button>
      </div>

      <div className="post-body">
        <div className="post-meta">
          <span className={`tag tag-${post.category}`}>{post.category}</span>
          <span className="meta-text">Posted by <strong>u/{post.author}</strong></span>
          <span className="meta-dot">·</span>
          <span className="meta-text">{post.createdAt ? formatDistanceToNow(post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt)) : 'just now'} ago</span>
        </div>

        <Link to={`/post/${post.id}`} className="post-title">{post.title}</Link>
        <p className="post-excerpt">{post.body.slice(0, 160)}{post.body.length > 160 ? '…' : ''}</p>

        <div className="post-actions">
          <Link to={`/post/${post.id}`} className="action-btn">
            <MessageSquare size={14} />
            {post.comments.length} comments
          </Link>
          <button className="action-btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}