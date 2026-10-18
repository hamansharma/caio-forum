import React from 'react';
import { Link } from 'react-router-dom';
import { openCookieSettings } from '../utils/analyticsConsent';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} CAIO Forum</span>
      <nav className="site-footer-links" aria-label="Legal">
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
        <button type="button" onClick={openCookieSettings}>Cookie settings</button>
      </nav>
    </footer>
  );
}
