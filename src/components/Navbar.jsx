import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, PlusCircle, LogOut, User } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import './Navbar.css';

export default function Navbar() {
  const { user, login, logout } = useForum();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) { login(username.trim()); setShowLogin(false); setUsername(''); }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <Brain size={22} />
          <span>CAIO Forum</span>
          <span className="navbar-badge">Chicago Booth</span>
        </Link>
        <div className="navbar-actions">
          {user ? (
            <>
              <button className="btn-create" onClick={() => navigate('/create')}>
                <PlusCircle size={16} /> Create Post
              </button>
              <div className="navbar-user">
                <User size={15} />
                <span>{user.username}</span>
              </div>
              <button className="btn-icon" onClick={logout} title="Logout"><LogOut size={16} /></button>
            </>
          ) : (
            <button className="btn-login" onClick={() => setShowLogin(true)}>Sign In</button>
          )}
        </div>
      </nav>

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Sign In to CAIO Forum</h2>
            <p>Enter a username to join the discussion</p>
            <form onSubmit={handleLogin}>
              <input
                autoFocus
                placeholder="Choose a username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="modal-input"
              />
              <button type="submit" className="btn-submit">Join Forum</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}