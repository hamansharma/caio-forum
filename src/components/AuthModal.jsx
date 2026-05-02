import React, { useState } from 'react';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import { generateUsername } from '../utils/usernameGenerator';
import './AuthModal.css';

export default function AuthModal({ onClose }) {
  const { login, signup } = useForum();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    email: '', password: '', fullName: '',
    username: generateUsername(),
    usernameType: 'random', // 'random' | 'real' | 'custom'
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleUsernameType = (type) => {
    set('usernameType', type);
    if (type === 'random') set('username', generateUsername());
    else if (type === 'real') set('username', form.fullName || '');
    else set('username', '');
  };

  const handleFullNameChange = (val) => {
    set('fullName', val);
    if (form.usernameType === 'real') set('username', val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!form.fullName.trim()) throw new Error('Please enter your full name.');
        if (!form.username.trim()) throw new Error('Please enter a username.');
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters.');
        await signup({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          username: form.username.trim(),
        });
      } else {
        await login({ email: form.email.trim(), password: form.password });
      }
      onClose();
    } catch (err) {
      const code = err?.code || '';
      const msg = typeof err?.message === 'string' ? err.message : '';
      if (code.includes('email-already-in-use') || msg.includes('email-already-in-use')) setError('An account with this email already exists.');
      else if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) setError('Invalid email or password.');
      else if (code.includes('invalid-email') || msg.includes('invalid-email')) setError('Please enter a valid email address.');
      else if (code.includes('weak-password') || msg.includes('weak-password')) setError('Password must be at least 6 characters.');
      else setError(typeof err?.message === 'string' ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>

        <div className="auth-header">
          <div className="auth-logo">CAIO Forum</div>
          <button className="auth-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }}>
            Sign In
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">

          {mode === 'signup' && (
            <div className="form-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={form.fullName}
                onChange={e => handleFullNameChange(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <div className="input-with-icon">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
              />
              <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="form-field">
              <label>Display Name on Forum</label>
              <div className="username-options">
                <button type="button"
                  className={`username-opt ${form.usernameType === 'random' ? 'active' : ''}`}
                  onClick={() => handleUsernameType('random')}>
                  Random
                </button>
                <button type="button"
                  className={`username-opt ${form.usernameType === 'real' ? 'active' : ''}`}
                  onClick={() => handleUsernameType('real')}>
                  Real Name
                </button>
                <button type="button"
                  className={`username-opt ${form.usernameType === 'custom' ? 'active' : ''}`}
                  onClick={() => handleUsernameType('custom')}>
                  Custom
                </button>
              </div>

              <div className="username-preview">
                {form.usernameType === 'random' ? (
                  <div className="random-username">
                    <span>u/{form.username}</span>
                    <button type="button" onClick={() => set('username', generateUsername())} title="Generate new">
                      <RefreshCw size={13} />
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={form.usernameType === 'real' ? 'Your real name' : 'Choose a username'}
                    value={form.username}
                    onChange={e => set('username', e.target.value)}
                    required
                  />
                )}
                <p className="username-hint">
                  {form.usernameType === 'random' && 'Your identity is masked. Click ↺ to generate a new one.'}
                  {form.usernameType === 'real' && 'Your real name will be visible to other forum members.'}
                  {form.usernameType === 'custom' && 'Choose any username you like.'}
                </p>
              </div>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>

        </form>

        <p className="auth-footer">
          {mode === 'signin'
            ? <>New here? <button onClick={() => { setMode('signup'); setError(''); }}>Create an account</button></>
            : <>Already have an account? <button onClick={() => { setMode('signin'); setError(''); }}>Sign in</button></>
          }
        </p>

      </div>
    </div>
  );
}