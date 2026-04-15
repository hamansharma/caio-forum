import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForum } from '../context/ForumContext';
import './CreatePost.css';

const CATEGORIES = ['concepts', 'discussion', 'strategy', 'ethics'];

export default function CreatePost() {
  const { user, addPost } = useForum();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', body: '', category: 'discussion' });

  if (!user) return (
    <div className="create-gate">
      <h2>Sign in to create a post</h2>
      <p>You need to be signed in to start a discussion.</p>
      <button onClick={() => navigate('/')}>Back to Forum</button>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    const id = await addPost(form);
    navigate(`/post/${id}`);
  };

  return (
    <div className="create-page">
      <h1>Create a Discussion</h1>
      <form className="create-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Category</label>
          <div className="cat-pills">
            {CATEGORIES.map(cat => (
              <button type="button" key={cat}
                className={`cat-pill tag-${cat} ${form.category === cat ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, category: cat }))}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Title</label>
          <input
            placeholder="What's your discussion about?"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            maxLength={200}
          />
          <span className="char-count">{form.title.length}/200</span>
        </div>
        <div className="form-group">
          <label>Body</label>
          <textarea
            placeholder="Share your thoughts, insights, or questions..."
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={8}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn-post" disabled={!form.title.trim() || !form.body.trim()}>
            Post Discussion
          </button>
        </div>
      </form>
    </div>
  );
}