import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, ArrowLeft, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useForum } from '../context/ForumContext';
import './PostDetail.css';

export default function PostDetail() {
  const { id } = useParams();
  const { posts, user, votePost, votedPosts, addComment, voteComment, votedComments } = useForum();
  const [comment, setComment] = useState('');
  const post = posts.find(p => p.id === id);

  if (!post) return <div className="not-found">Post not found. <Link to="/">Go home</Link></div>;

  const voted = votedPosts[post.id] || 0;

  const handleComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addComment(post.id, comment.trim());
    setComment('');
  };

  return (
    <div className="detail-page">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to feed</Link>

      <article className="detail-post">
        <div className="detail-vote">
          <button className={`vote-btn up ${voted === 1 ? 'active' : ''}`} onClick={() => votePost(post.id, voted === 1 ? 0 : 1)}><ArrowUp size={18} /></button>
          <span className={`vote-count ${voted !== 0 ? 'voted' : ''}`}>{post.votes}</span>
          <button className={`vote-btn down ${voted === -1 ? 'active' : ''}`} onClick={() => votePost(post.id, voted === -1 ? 0 : -1)}><ArrowDown size={18} /></button>
        </div>
        <div className="detail-content">
          <div className="post-meta">
            <span className={`tag tag-${post.category}`}>{post.category}</span>
            <span className="meta-text">u/<strong>{post.author}</strong> · {post.createdAt ? formatDistanceToNow(post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt)) : 'just now'} ago</span>
          </div>
          <h1 className="detail-title">{post.title}</h1>
          <p className="detail-body">{post.body}</p>
        </div>
      </article>

      <section className="comments-section">
        <h2><MessageSquare size={16} /> {post.comments.length} Comments</h2>

        {user ? (
          <form className="comment-form" onSubmit={handleComment}>
            <textarea
              placeholder={`Comment as u/${user.username}`}
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
            />
            <button type="submit" disabled={!comment.trim()}>Add Comment</button>
          </form>
        ) : (
          <div className="login-prompt">
            <span>Sign in to leave a comment</span>
          </div>
        )}

        <div className="comments-list">
          {post.comments.map(c => {
            const cVoted = votedComments[`${post.id}-${c.id}`] || 0;
            return (
              <div key={c.id} className="comment">
                <div className="comment-vote">
                  <button className={`vote-btn up ${cVoted === 1 ? 'active' : ''}`} onClick={() => voteComment(post.id, c.id, cVoted === 1 ? 0 : 1)}><ArrowUp size={13} /></button>
                  <span className={cVoted !== 0 ? 'voted' : ''}>{c.votes}</span>
                  <button className={`vote-btn down ${cVoted === -1 ? 'active' : ''}`} onClick={() => voteComment(post.id, c.id, cVoted === -1 ? 0 : -1)}><ArrowDown size={13} /></button>
                </div>
                <div className="comment-content">
                  <div className="comment-meta">
                    <strong>u/{c.author}</strong>
                    <span>· {c.createdAt ? formatDistanceToNow(new Date(c.createdAt)) : 'just now'} ago</span>
                  </div>
                  <p>{c.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}