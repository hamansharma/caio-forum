import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MemberLink from './MemberLink';
import { ArrowUp, ArrowDown, Check, MessageSquare, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useForum } from '../context/ForumContext';
import { postPath } from '../utils/postUrl';
import CategoryTag from './CategoryTag';
import { excerpt, plural, toMillis, visibleComments } from '../utils/postDisplay';
import './PostCard.css';

export default function PostCard({ post }) {
  const { user, votePost, votedPosts } = useForum();
  const voted = votedPosts[post.id] || 0;
  const voteTitle = direction => (user ? direction : 'Sign in to vote');
  const [shareState, setShareState] = useState('');
  useEffect(() => {
    if (!shareState) return undefined;
    const timer = setTimeout(() => setShareState(''), 2000);
    return () => clearTimeout(timer);
  }, [shareState]);

  const share = async () => {
    const url = `${window.location.origin}${postPath(post)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareState('copied');
    } catch {
      window.prompt('Copy this link:', url); // clipboard unavailable (e.g. insecure context)
    }
  };
  const created = toMillis(post.createdAt);

  return (
    <div className="post-card">
      <div className="vote-col">
        <button className={`vote-btn up ${voted === 1 ? 'active' : ''}`} title={voteTitle('Upvote')} aria-label={voteTitle('Upvote')} aria-pressed={voted === 1} onClick={() => votePost(post.id, voted === 1 ? 0 : 1)}>
          <ArrowUp size={16} />
        </button>
        <span className={`vote-count ${voted !== 0 ? 'voted' : ''}`}>{post.votes}</span>
        <button className={`vote-btn down ${voted === -1 ? 'active' : ''}`} title={voteTitle('Downvote')} aria-label={voteTitle('Downvote')} aria-pressed={voted === -1} onClick={() => votePost(post.id, voted === -1 ? 0 : -1)}>
          <ArrowDown size={16} />
        </button>
      </div>

      <div className="post-body">
        <div className="post-meta">
          <CategoryTag post={post} />
          {post.playgroundTool && <span className="post-playground-tool">{post.playgroundTool === 'general' ? 'AI Playground' : post.playgroundTool === 'certifications' ? 'Certification Navigator' : post.playgroundTool === 'compass' ? 'CAIO Compass' : 'Health Analytics'}</span>}
          <span className="meta-text">Posted by <strong><MemberLink name={post.author} /></strong></span>
          <span className="meta-dot">·</span>
          <time className="meta-text" dateTime={created ? new Date(created).toISOString() : undefined} title={created ? new Date(created).toLocaleString() : undefined}>
            {created ? `${formatDistanceToNow(created)} ago` : 'just now'}
          </time>
        </div>

        <Link to={postPath(post)} className="post-title">{post.title}</Link>
        <p className="post-excerpt">{excerpt(post.body)}</p>

        <div className="post-actions">
          <Link to={postPath(post)} className="action-btn">
            <MessageSquare size={14} />
            {plural(visibleComments(post).length, 'comment')}
          </Link>
          <button type="button" className={`action-btn ${shareState ? 'copied' : ''}`} onClick={share} aria-live="polite">
            {shareState ? <><Check size={14} /> Link copied</> : <><Share2 size={14} /> Share</>}
          </button>
        </div>
      </div>
    </div>
  );
}
