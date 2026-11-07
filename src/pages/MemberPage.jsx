import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePosts } from '../context/ForumContext';
import usePageMeta from '../hooks/usePageMeta';
import useStructuredData from '../hooks/useStructuredData';
import { memberActivity } from '../utils/memberActivity';
import { memberPath, postPath } from '../utils/postUrl';
import { excerpt, plural } from '../utils/postDisplay';
import { memberStructuredData } from '../utils/structuredData';
import './MemberPage.css';

const formatDate = ms => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// A member's public page: their posts and comments. Authors in each post's
// structured data link here. Shows only what is already public on the forum.
export default function MemberPage() {
  const { username = '' } = useParams();
  const { posts, loading } = usePosts();
  const navigate = useNavigate();
  const activity = memberActivity(posts.filter(post => !post.partial), username);
  const { name } = activity;
  const found = Boolean(name);
  const path = memberPath(name || username) || '/';

  // /u/haman%20sharma → /u/Haman%20Sharma, the spelling on their content.
  useEffect(() => {
    if (found && name !== username) navigate(path, { replace: true });
  }, [found, name, username, path, navigate]);

  const description = found
    ? `Posts and comments by u/${name} on CAIO Forum, the community for AI leaders: ${plural(activity.posts.length, 'post')} and ${plural(activity.comments.length, 'comment')}.`
    : 'CAIO Forum member.';
  usePageMeta(found ? `u/${name} | CAIO Forum Member` : 'Member not found | CAIO Forum', description,
    { canonicalPath: path, noIndex: !loading && !found, pending: loading });
  useStructuredData(found ? memberStructuredData(activity) : null);

  if (loading) return <main className="member-page"><p className="member-muted">Loading…</p></main>;
  if (!found) return <main className="member-page"><h1>Member not found</h1><p className="member-muted">No posts or comments by u/{username}. <Link to="/">Back to the forum</Link></p></main>;

  return (
    <main className="member-page">
      <header className="member-header">
        <div className="member-avatar" aria-hidden="true">{name[0].toUpperCase()}</div>
        <div>
          <h1>u/{name}</h1>
          <p className="member-muted">
            {plural(activity.posts.length, 'post')} · {plural(activity.comments.length, 'comment')}
            {activity.firstActive ? ` · active since ${formatDate(activity.firstActive)}` : ''}
          </p>
        </div>
      </header>

      <section aria-labelledby="member-posts">
        <h2 id="member-posts">Posts</h2>
        {activity.posts.length ? (
          <ul className="member-list">
            {activity.posts.map(post => (
              <li key={post.id}>
                <Link to={postPath(post)}>
                  <strong>{post.title}</strong>
                  <span>{excerpt(post.body, 160)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="member-muted">No posts yet.</p>}
      </section>

      <section aria-labelledby="member-comments">
        <h2 id="member-comments">Comments</h2>
        {activity.comments.length ? (
          <ul className="member-list">
            {activity.comments.map(({ post, comment }) => (
              <li key={`${post.id}-${comment.id}`}>
                <Link to={`${postPath(post)}#comment-${comment.id}`}>
                  <strong>{excerpt(comment.body, 160)}</strong>
                  <span>on {post.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="member-muted">No comments yet.</p>}
      </section>
    </main>
  );
}
