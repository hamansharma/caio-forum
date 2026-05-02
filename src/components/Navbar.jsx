import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, LogOut, User } from 'lucide-react';
import logo from '../assets/CAIO.png';
import { useForum } from '../context/ForumContext';
import AuthModal from './AuthModal';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, authLoading } = useForum();
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="CAIO Forum" className="navbar-logo" />
          <span>CAIO Forum</span>
          <span className="navbar-badge">Roadmap to Chief AI Officer</span>
        </Link>

        <div className="navbar-actions">
          {authLoading ? (
            <span className="nav-loading">Loading…</span>
          ) : user ? (
            <>
              <button className="btn-create" onClick={() => navigate('/create')}>
                <PlusCircle size={16} /> Create Post
              </button>
              <div className="navbar-user" title={user.fullName}>
                <User size={15} />
                <span>u/{user.username}</span>
              </div>
              <button className="btn-icon" onClick={logout} title="Sign out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button className="btn-login" onClick={() => setShowAuth(true)}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}