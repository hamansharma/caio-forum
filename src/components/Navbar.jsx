import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, PlusCircle, LogOut, Moon, Sun, User } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import AuthModal from './AuthModal';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import { searchPosts } from '../utils/search';
import './Navbar.css';
import logo from '../assets/CAIO.png';

export default function Navbar() {
  const { user, logout, authLoading, posts } = useForum();
  const [showAuth, setShowAuth] = useState(false);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [daylight, setDaylight] = useState(() => window.localStorage.getItem('caio-theme') === 'daylight');
  const searchRef = useRef();
  const navigate = useNavigate();

  const { results } = searchPosts(posts, query);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = daylight ? 'daylight' : 'dark';
    window.localStorage.setItem('caio-theme', daylight ? 'daylight' : 'dark');
  }, [daylight]);

  const handleQueryChange = (val) => {
    setQuery(val);
    setShowResults(val.trim().length > 0);
  };

  const handleClose = () => {
    setQuery('');
    setShowResults(false);
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="CAIO Forum" className="navbar-logo" />
          <span className="navbar-title">CAIO Forum</span>
          <span className="navbar-badge">Roadmap to Chief AI Officer</span>
        </Link>

        <div className="navbar-search" ref={searchRef}>
          <SearchBar value={query} onChange={handleQueryChange} onFocus={() => query && setShowResults(true)} />
          {showResults && (
            <SearchResults results={results} query={query} onClose={handleClose} />
          )}
        </div>

        <div className="navbar-actions">
          <button className="btn-playground" onClick={() => navigate('/playground')}>
            <Activity size={16} /> <span className="nav-label">AI Playground</span>
          </button>
          <button className="btn-icon theme-toggle" onClick={() => setDaylight(current => !current)} title={daylight ? 'Use dark theme' : 'Use daylight theme'} aria-label={daylight ? 'Use dark theme' : 'Use daylight theme'}>
            {daylight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          {authLoading ? (
            <span className="nav-loading">Loading…</span>
          ) : user ? (
            <>
              <button className="btn-create" onClick={() => navigate('/create')}>
                <PlusCircle size={16} /> <span className="nav-label">Create Post</span>
              </button>
              <Link to="/profile" className="navbar-user" title={user.fullName}>
                <User size={15} />
                <span>u/{user.username}</span>
              </Link>
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
