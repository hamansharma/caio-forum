import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForum } from '../context/ForumContext';
import MarkdownEditor from '../components/MarkdownEditor';
import CharCount from '../components/CharCount';
import { validatePostTitle, validatePostBody, sanitizeText, LIMITS } from '../utils/validate';
import './CreatePost.css';

const CATEGORIES = ['concepts', 'discussion', 'strategy', 'ethics', 'links'];

export default function CreatePost() {
  const { user, addPost } = useForum();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', body: '', category: 'discussion' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!user) return (
    <div className="create-gate">
      <h2>Sign in to create a post</h2>
      <p>You need to be signed in to start a discussion.</p>
      <button onClick={() => navigate('/')}>Back to Forum</button>
    </div>
  );

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    const titleErr = validatePostTitle(form.title);
    const bodyErr = validatePostBody(form.body);
    if (titleErr) errs.title = titleErr;
    if (bodyErr) errs.body = bodyErr;
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const id = await addPost({
        ...form,
        title: sanitizeText(form.title),
        body: sanitizeText(form.body),
      });
      navigate(`/post/${id}`);
    } catch (err) {
      setErrors({ submit: 'Failed to create post. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const isOver = form.title.length > LIMITS.POST_TITLE_MAX ||
    form.body.length > LIMITS.POST_BODY_MAX;

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
                onClick={() => set('category', cat)}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label>Title</label>
            <CharCount current={form.title.length} max={LIMITS.POST_TITLE_MAX} />
          </div>
          <input
            placeholder="What's your discussion about?"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            maxLength={LIMITS.POST_TITLE_MAX + 50}
            className={errors.title ? 'input-error' : ''}
          />
          {errors.title && <span className="field-error">{errors.title}</span>}
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label>Body</label>
            <CharCount current={form.body.length} max={LIMITS.POST_BODY_MAX} />
          </div>
          <MarkdownEditor
            value={form.body}
            onChange={val => set('body', val)}
            placeholder="Share your thoughts, insights, or questions..."
            rows={8}
          />
          {errors.body && <span className="field-error">{errors.body}</span>}
        </div>

        {errors.submit && <div className="submit-error">{errors.submit}</div>}

        <div className="form-actions">
          <button type="button" className="btn-cancel"
            onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn-post"
            disabled={submitting || isOver}>
            {submitting ? 'Posting…' : 'Post Discussion'}
          </button>
        </div>
      </form>
    </div>
  );
}