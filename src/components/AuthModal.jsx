import React, { useState } from 'react';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import { generateUsername } from '../utils/usernameGenerator';
import './AuthModal.css';

export default function AuthModal({ onClose }) {
  const { login, signup, googleSignIn } = useForum();
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
      
      if (msg.includes('USERNAME_TAKEN')) setError('That username is already taken. Please choose a different one.');
        else if (code.includes('email-already-in-use') || msg.includes('email-already-in-use')) setError('An account with this email already exists.');
        else if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) setError('Invalid email or password.');
        else if (code.includes('invalid-email') || msg.includes('invalid-email')) setError('Please enter a valid email address.');
        else if (code.includes('weak-password') || msg.includes('weak-password')) setError('Password must be at least 6 characters.');
        else setError(typeof err?.message === 'string' ? err.message : 'Something went wrong. Please try again.');
      } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      await googleSignIn();
      onClose();
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        setError('Google sign-in was cancelled.');
      } else if (code.includes('account-exists-with-different-credential')) {
        setError('An account with this email already uses email and password. Sign in with your password first.');
      } else if (code.includes('operation-not-allowed')) {
        setError('Google sign-in is not enabled yet. Enable Google in Firebase Authentication, then try again.');
      } else {
        setError(typeof err?.message === 'string' ? err.message : 'Unable to sign in with Google. Please try again.');
      }
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

        <div className="auth-google-section">
          <button type="button" className="auth-google-button" onClick={handleGoogleSignIn} disabled={submitting}>
            <GoogleIcon /> Continue with Google
          </button>
          <div className="auth-divider"><span>or use email</span></div>
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

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.22-.2-1.76H12v3.44h5.52c-.11.86-.72 2.15-2.07 3.02l-.02.12 3.01 2.28.21.02c1.91-1.73 2.95-4.27 2.95-7.12Z"/><path fill="#34A853" d="M12 21.75c2.7 0 4.96-.87 6.61-2.37l-3.2-2.42c-.86.59-2.01 1-3.41 1-2.64 0-4.88-1.73-5.68-4.12l-.12.01-3.13 2.37-.04.11A9.98 9.98 0 0 0 12 21.75Z"/><path fill="#FBBC05" d="M6.32 13.84A5.98 5.98 0 0 1 6 12c0-.64.12-1.26.31-1.84v-.13L3.14 7.62l-.1.04A9.64 9.64 0 0 0 2 12c0 1.56.37 3.04 1.04 4.34l3.28-2.5Z"/><path fill="#EA4335" d="M12 6.04c1.77 0 2.97.75 3.65 1.38l2.67-2.56C16.95 3.6 14.7 2.25 12 2.25a9.98 9.98 0 0 0-8.96 5.41l3.28 2.5C7.12 7.77 9.36 6.04 12 6.04Z"/></svg>;
}
