import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePosts } from '../context/ForumContext';
import usePageMeta from '../hooks/usePageMeta';
import useStructuredData from '../hooks/useStructuredData';
import { memberActivity, memberView, sameMember } from '../utils/memberActivity';
import { memberPath } from '../utils/postUrl';
import { plural } from '../utils/postDisplay';
import { pageData } from '../utils/pageData';
import { memberStructuredData } from '../utils/structuredData';
import './MemberPage.css';

const formatDate = ms => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// A member's public page: their posts and comments. Authors in each post's
// structured data link here. Shows only what is already public on the forum.
export default function MemberPage() {
  const { username = '' } = useParams();
  const { posts, loading } = usePosts();
  const navigate = useNavigate();
  // Live data once the posts load; until then (or if Firestore can't be
  // reached, as for search-engine renderers) what the server shipped.
  const activity = memberActivity(posts.filter(post => !post.partial), username);
  const shipped = pageData.member && sameMember(pageData.member.name, username) ? pageData.member : null;
  const view = activity.name ? memberView(activity) : shipped;
  const name = view?.name;
  const path = memberPath(name || username) || '/';

  // /u/haman%20sharma → /u/Haman%20Sharma, the spelling on their content.
  useEffect(() => {
    if (name && name !== username) navigate(path, { replace: true });
  }, [name, username, path, navigate]);

  const description = view
    ? `Posts and comments by u/${name} on CAIO Forum, the community for AI leaders: ${plural(view.posts.length, 'post')} and ${plural(view.comments.length, 'comment')}.`
    : 'CAIO Forum member.';
  // "Not found" (and noindex) only once the posts have really loaded without them.
  usePageMeta(view ? `u/${name} | CAIO Forum Member` : 'Member not found | CAIO Forum', description,
    { canonicalPath: path, noIndex: !view && !loading, pending: !view && loading });
  useStructuredData(view ? memberStructuredData(view) : null);

  if (!view && loading) return <main className="member-page"><p className="member-muted">Loading…</p></main>;
  if (!view) return <main className="member-page"><h1>Member not found</h1><p className="member-muted">No posts or comments by u/{username}. <Link to="/">Back to the forum</Link></p></main>;

  return (
    <main className="member-page">
      <header className="member-header">
        <div className="member-avatar" aria-hidden="true">{name[0].toUpperCase()}</div>
        <div>
          <h1>u/{name}</h1>
          <p className="member-muted">
            {plural(view.posts.length, 'post')} · {plural(view.comments.length, 'comment')}
            {view.firstActive ? ` · active since ${formatDate(view.firstActive)}` : ''}
          </p>
        </div>
      </header>

      <section aria-labelledby="member-posts">
        <h2 id="member-posts">Posts</h2>
        {view.posts.length ? (
          <ul className="member-list">
            {view.posts.map(item => (
              <li key={item.key}><Link to={item.path}><strong>{item.title}</strong><span>{item.text}</span></Link></li>
            ))}
          </ul>
        ) : <p className="member-muted">No posts yet.</p>}
      </section>

      <section aria-labelledby="member-comments">
        <h2 id="member-comments">Comments</h2>
        {view.comments.length ? (
          <ul className="member-list">
            {view.comments.map(item => (
              <li key={item.key}><Link to={item.path}><strong>{item.text}</strong><span>on {item.on}</span></Link></li>
            ))}
          </ul>
        ) : <p className="member-muted">No comments yet.</p>}
      </section>
    </main>
  );
}
