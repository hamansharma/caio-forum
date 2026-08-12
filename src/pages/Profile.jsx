import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Pencil, Trash2, RefreshCw, Lock, Check } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import { generateUsername } from '../utils/usernameGenerator';
import InlineConfirm from '../components/InlineConfirm';
import './Profile.css';

const SECTIONS = ['display', 'alias', 'password', 'danger'];

export default function Profile() {
  const { user, posts, updateAlias, updatePassword, deleteAccount } = useForum();
  const navigate = useNavigate();

  const [section, setSection] = useState('display');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Alias form
  const [aliasType, setAliasType] = useState('custom');
  const [alias, setAlias] = useState(user?.username || '');
  const [useAliasForPosts, setUseAliasForPosts] = useState(user?.useAlias ?? true);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  if (!user) {
    navigate('/');
    return null;
  }

  const userPosts = posts.filter(p => p.author === user.username || p.author === user.fullName);
  const userComments = posts.reduce((acc, p) =>
    acc + (p.comments || []).filter(c => c.author === user.username).length, 0);

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  const handleAliasTypeChange = (type) => {
    setAliasType(type);
    if (type === 'random') setAlias(generateUsername());
    else if (type === 'real') setAlias(user.fullName || '');
    else setAlias('');
  };

  const handleSaveAlias = async (e) => {
    e.preventDefault();
    setError('');
    if (!alias.trim()) { setError('Please enter a display name.'); return; }
    try {
      await updateAlias(alias.trim(), useAliasForPosts);
      showSaved('Display name updated — applies to future posts.');
    } catch (err) {
      setError(err.message || 'Failed to update display name.');
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showSaved('Password updated successfully.');
    } catch (err) {
      if (err.code?.includes('wrong-password') || err.code?.includes('invalid-credential'))
        setError('Current password is incorrect.');
      else if (err.code?.includes('requires-recent-login'))
        setError('Please sign out and sign back in before changing your password.');
      else setError(err.message || 'Failed to update password.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      navigate('/');
    } catch (err) {
      if (err.code?.includes('requires-recent-login'))
        setError('Please sign out and sign back in before deleting your account.');
      else setError(err.message || 'Failed to delete account.');
      setConfirmDelete(false);
      setSection('danger');
    }
  };

  const showSaved = (msg) => {
    setSaved(msg);
    setTimeout(() => setSaved(''), 3000);
  };

  const initials = user.fullName
    ? user.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user.username?.[0]?.toUpperCase() || '?';

  return (
    <div className="profile-page">
      <div className="profile-layout">

        {/* Sidebar */}
        <aside className="profile-sidebar">
          <div className="profile-avatar-lg">{initials}</div>
          <div className="profile-name">{user.fullName}</div>
          <div className="profile-username">u/{user.username}</div>
          <div className="profile-stats">
            <div className="profile-stat">
              <strong>{userPosts.length}</strong>
              <span>Posts</span>
            </div>
            <div className="profile-stat">
              <strong>{userComments}</strong>
              <span>Comments</span>
            </div>
          </div>
          <div className="profile-member-since">Member since {memberSince}</div>

          <nav className="profile-nav">
            <button className={section === 'display' ? 'active' : ''} onClick={() => { setSection('display'); setError(''); }}>
              <User size={14} /> Display Name
            </button>
            <button className={section === 'password' ? 'active' : ''} onClick={() => { setSection('password'); setError(''); }}>
              <Lock size={14} /> Password
            </button>
            <button className={`danger-nav ${section === 'danger' ? 'active' : ''}`} onClick={() => { setSection('danger'); setError(''); }}>
              <Trash2 size={14} /> Delete Account
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="profile-main">

          {saved && (
            <div className="profile-success">
              <Check size={15} /> {saved}
            </div>
          )}
          {error && <div className="profile-error">{error}</div>}

          {/* Display Name Section */}
          {section === 'display' && (
            <div className="profile-section">
              <h2>Display Name</h2>
              <p className="section-desc">
                Choose how your name appears on future posts and comments.
                This won't change your existing posts.
              </p>

              <form onSubmit={handleSaveAlias} className="profile-form">
                <div className="form-field">
                  <label>Name Style</label>
                  <div className="alias-type-pills">
                    {[
                      { key: 'custom', label: 'Custom' },
                      { key: 'real', label: 'Real Name' },
                      { key: 'random', label: 'Random' },
                    ].map(({ key, label }) => (
                      <button key={key} type="button"
                        className={`alias-pill ${aliasType === key ? 'active' : ''}`}
                        onClick={() => handleAliasTypeChange(key)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label>Display Name</label>
                  {aliasType === 'random' ? (
                    <div className="random-name-row">
                      <div className="random-name-preview">u/{alias}</div>
                      <button type="button" className="btn-regenerate"
                        onClick={() => setAlias(generateUsername())}>
                        <RefreshCw size={13} /> Regenerate
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={alias}
                      onChange={e => setAlias(e.target.value)}
                      placeholder={aliasType === 'real' ? user.fullName : 'Enter a display name'}
                    />
                  )}
                  <p className="field-hint">
                    Current display name: <strong>u/{user.username}</strong>
                  </p>
                </div>

                <div className="form-field">
                  <label>Post Attribution</label>
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <span>Use this name on future posts</span>
                      <span className="toggle-sub">
                        When off, your real name ({user.fullName}) will be used instead
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`toggle-btn ${useAliasForPosts ? 'on' : 'off'}`}
                      onClick={() => setUseAliasForPosts(!useAliasForPosts)}>
                      <span className="toggle-knob" />
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-save">Save Display Name</button>
              </form>
            </div>
          )}

          {/* Password Section */}
          {section === 'password' && (
            <div className="profile-section">
              <h2>Change Password</h2>
              <p className="section-desc">
                Choose a strong password of at least 6 characters.
              </p>
              <form onSubmit={handleSavePassword} className="profile-form">
                <div className="form-field">
                  <label>Current Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Your current password"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Confirm New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                </div>
                <label className="show-password-toggle">
                  <input type="checkbox"
                    checked={showPasswords}
                    onChange={e => setShowPasswords(e.target.checked)} />
                  Show passwords
                </label>
                <button type="submit" className="btn-save">Update Password</button>
              </form>
            </div>
          )}

          {/* Danger Zone */}
          {section === 'danger' && (
            <div className="profile-section danger-zone">
              <h2>Delete Account</h2>
              <p className="section-desc">
                Permanently delete your account. Your posts and comments will be
                anonymized to <strong>[deleted]</strong>. This cannot be undone.
              </p>
              <div className="danger-box">
                <div className="danger-box-info">
                  <Trash2 size={18} />
                  <div>
                    <strong>Delete {user.fullName}'s account</strong>
                    <span>{userPosts.length} posts and {userComments} comments will be anonymized</span>
                  </div>
                </div>
                {confirmDelete ? (
                  <InlineConfirm
                    message="Permanently delete your account?"
                    onConfirm={handleDeleteAccount}
                    onCancel={() => setConfirmDelete(false)}
                  />
                ) : (
                  <button className="btn-delete-account"
                    onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={14} /> Delete My Account
                  </button>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}